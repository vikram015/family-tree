import { getMessaging, getToken, deleteToken, onMessage, isSupported } from "firebase/messaging";
import type { Messaging, MessagePayload } from "firebase/messaging";
import { firebaseApp } from "../firebase";
import { ApiService } from "./apiService";

/**
 * Web push (FCM) plumbing: permission, token lifecycle, and foreground messages.
 *
 * Push is strictly optional — every function degrades quietly when the browser
 * doesn't support it, the user has denied permission, or the VAPID key is
 * missing, so callers never need to guard.
 */

const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;

/** Key under which the last-registered token is cached, so we can unregister it on sign-out. */
const TOKEN_STORAGE_KEY = "kinvia.fcmToken";

let messagingInstance: Messaging | null = null;
let supportChecked = false;
let supported = false;

async function ensureSupported(): Promise<boolean> {
  if (supportChecked) return supported;
  supportChecked = true;
  try {
    // isSupported() covers Safari/iOS and any browser lacking the Push API.
    supported = (await isSupported()) && "serviceWorker" in navigator;
  } catch {
    supported = false;
  }
  return supported;
}

function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Private mode — the token still works for this session.
  }
}

async function getMessagingInstance(): Promise<Messaging | null> {
  if (!(await ensureSupported())) return null;
  if (!messagingInstance) {
    messagingInstance = getMessaging(firebaseApp);
  }
  return messagingInstance;
}

// These MUST match the Firebase SDK's own DEFAULT_SW_PATH / DEFAULT_SW_SCOPE.
// The SDK silently re-registers the worker at these exact values whenever it
// needs a registration it doesn't already hold (e.g. deleteToken after a
// reload). If ours differed — including by a query string — the two
// registrations would fight and the SDK's would win with a broken config.
const MESSAGING_SW_PATH = "/firebase-messaging-sw.js";
const MESSAGING_SW_SCOPE = "/firebase-cloud-messaging-push-scope";

/**
 * Registers the dedicated FCM worker. Its Firebase config is baked into
 * public/firebase-messaging-config.js at build time, so no params are needed.
 */
async function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  try {
    const registration = await navigator.serviceWorker.register(MESSAGING_SW_PATH, {
      scope: MESSAGING_SW_SCOPE,
    });
    // getToken() needs an ACTIVE worker. On a first-time opt-in the worker is
    // still installing here, and calling getToken() too early fails outright.
    await waitForActivation(registration);
    return registration;
  } catch (error) {
    console.warn("Failed to register FCM service worker:", error);
    return undefined;
  }
}

function waitForActivation(registration: ServiceWorkerRegistration): Promise<void> {
  if (registration.active) return Promise.resolve();

  const worker = registration.installing || registration.waiting;
  if (!worker) return Promise.resolve();

  return new Promise<void>((resolve) => {
    // Guard against a worker that activates between the check above and the
    // listener being attached, and against one that never activates at all.
    const timeout = window.setTimeout(resolve, 10000);
    const done = () => {
      window.clearTimeout(timeout);
      worker.removeEventListener("statechange", onStateChange);
      resolve();
    };
    const onStateChange = () => {
      if (worker.state === "activated" || worker.state === "redundant") {
        done();
      }
    };
    if (worker.state === "activated") {
      done();
      return;
    }
    worker.addEventListener("statechange", onStateChange);
  });
}

export const pushNotifications = {
  /** True when this browser can receive web push at all. */
  async isSupported(): Promise<boolean> {
    return ensureSupported();
  },

  /** "granted" | "denied" | "default" | "unsupported" */
  async getPermissionState(): Promise<NotificationPermission | "unsupported"> {
    if (!(await ensureSupported())) return "unsupported";
    return Notification.permission;
  },

  /**
   * Fetches the FCM token and hands it to the backend.
   *
   * `promptIfNeeded: false` (the default) only proceeds when permission was
   * already granted — so app startup never triggers a permission popup, which
   * browsers penalise and users reflexively dismiss. Pass true from an explicit
   * "enable notifications" action.
   *
   * Returns the token, or null when push is unavailable/declined.
   */
  async register(options: { promptIfNeeded?: boolean } = {}): Promise<string | null> {
    if (!(await ensureSupported())) return null;

    if (!VAPID_KEY) {
      console.warn(
        "REACT_APP_FIREBASE_VAPID_KEY is not set — push notifications are disabled.",
      );
      return null;
    }

    if (Notification.permission === "denied") return null;

    if (Notification.permission !== "granted") {
      if (!options.promptIfNeeded) return null;
      const result = await Notification.requestPermission();
      if (result !== "granted") return null;
    }

    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return null;

      const serviceWorkerRegistration = await registerMessagingServiceWorker();
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration,
      });

      if (!token) return null;

      await ApiService.registerDeviceToken(token);
      storeToken(token);
      return token;
    } catch (error) {
      console.warn("Failed to register for push notifications:", error);
      return null;
    }
  },

  /**
   * Drops this device's token. Called on sign-out so the next person to use
   * the browser doesn't receive the previous user's notifications.
   */
  async unregister(): Promise<void> {
    const token = getStoredToken();
    storeToken(null);

    if (token) {
      try {
        await ApiService.unregisterDeviceToken(token);
      } catch {
        // Server-side cleanup is best-effort; the local token is dropped below.
      }
    }

    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      // deleteToken() reaches for `swRegistration.pushManager`, and the SDK
      // only auto-registers the worker when it has none. If that registration
      // is missing or failed, the SDK throws an opaque
      // "Cannot read properties of undefined (reading 'pushManager')" — so make
      // sure an active registration exists before asking it to delete.
      const registration = await navigator.serviceWorker.getRegistration(
        MESSAGING_SW_SCOPE,
      );
      if (!registration?.active) {
        return;
      }

      await deleteToken(messaging);
    } catch (error) {
      // Nothing to delete, push unsupported, or the worker is already gone.
      console.warn("Failed to delete FCM token:", error);
    }
  },

  /**
   * Subscribes to messages that arrive while the app is in the foreground
   * (the service worker only handles background ones). Returns an unsubscribe
   * function, or a no-op when push is unavailable.
   */
  async onForegroundMessage(
    handler: (payload: MessagePayload) => void,
  ): Promise<() => void> {
    const messaging = await getMessagingInstance();
    if (!messaging) return () => {};
    try {
      return onMessage(messaging, handler);
    } catch {
      return () => {};
    }
  },
};

export default pushNotifications;
