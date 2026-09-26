import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MessagePayload } from "firebase/messaging";
import { pushNotifications } from "../../services/pushNotifications";
import { useAuth } from "./useAuth";

export type ForegroundNotification = {
  title: string;
  body: string;
  clickPath: string;
};

/**
 * Owns web-push state for the signed-in user.
 *
 * Re-registers the FCM token on every sign-in (tokens rotate, and the backend
 * keys them per user), but only when permission was already granted — the
 * permission prompt itself is left to an explicit user action via `enable()`.
 */
export function usePushNotifications() {
  const { currentUser } = useAuth() as any;
  const navigate = useNavigate();

  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [enabling, setEnabling] = useState(false);
  const [notification, setNotification] = useState<ForegroundNotification | null>(null);

  useEffect(() => {
    let active = true;
    pushNotifications.getPermissionState().then((state) => {
      if (active) setPermission(state);
    });
    return () => {
      active = false;
    };
  }, [currentUser]);

  // Refresh the stored token whenever a user is signed in and has already
  // allowed notifications. Silent no-op otherwise.
  useEffect(() => {
    if (!currentUser) return;
    void pushNotifications.register();
  }, [currentUser]);

  // Foreground messages never reach the service worker, so surface them in-app.
  useEffect(() => {
    if (!currentUser) return;

    let unsubscribe: (() => void) | undefined;
    let active = true;

    pushNotifications
      .onForegroundMessage((payload: MessagePayload) => {
        if (!active) return;
        const data = (payload.data || {}) as Record<string, string>;
        setNotification({
          title: payload.notification?.title || "New notification",
          body: payload.notification?.body || "",
          clickPath: data.clickPath || "/requests",
        });
      })
      .then((unsub) => {
        if (!active) {
          unsub();
          return;
        }
        unsubscribe = unsub;
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [currentUser]);

  /** Explicit opt-in — triggers the browser permission prompt if needed. */
  const enable = useCallback(async () => {
    setEnabling(true);
    try {
      const token = await pushNotifications.register({ promptIfNeeded: true });
      setPermission(await pushNotifications.getPermissionState());
      return Boolean(token);
    } finally {
      setEnabling(false);
    }
  }, []);

  const dismissNotification = useCallback(() => setNotification(null), []);

  const openNotification = useCallback(() => {
    if (notification) {
      navigate(notification.clickPath);
      setNotification(null);
    }
  }, [navigate, notification]);

  return {
    permission,
    enabling,
    enable,
    notification,
    dismissNotification,
    openNotification,
    canPrompt: permission === "default",
    isEnabled: permission === "granted",
    isUnsupported: permission === "unsupported",
  };
}

export default usePushNotifications;
