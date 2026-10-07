/* eslint-disable no-undef */
/**
 * FCM background message handler.
 *
 * This is a SEPARATE worker from the Workbox one in src/service-worker.ts.
 * Firebase registers it under its own scope
 * (/firebase-cloud-messaging-push-scope), so the two coexist without fighting
 * over navigation requests.
 *
 * The Firebase config comes from firebase-messaging-config.js, generated at
 * build time by scripts/generate-messaging-config.js. It must NOT depend on
 * query params: the Firebase SDK re-registers this file at its bare default
 * path ("/firebase-messaging-sw.js") whenever it needs a registration it
 * doesn't already hold, and any query string would be lost — leaving the
 * worker with no config.
 */

importScripts("https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js");
importScripts("/firebase-messaging-config.js");

const config = self.__FIREBASE_CONFIG__ || {};

if (config.apiKey && config.projectId && config.appId) {
  firebase.initializeApp(config);

  // Every notification tap, ours and Firebase's. Registered BEFORE
  // firebase.messaging() so it runs first and can stop Firebase's own handler,
  // which only reuses a window already on the exact same URL and otherwise
  // opens another one — and when it does reuse one, the page is just focused
  // and keeps showing whatever it loaded earlier. Here any open Kinvia window
  // is reused and told which page to show, and the page loads it fresh.
  self.addEventListener("notificationclick", (event) => {
    const link = notificationLink(event.notification);
    if (!link) return; // Not one of ours — leave it to whoever raised it.
    event.stopImmediatePropagation();
    event.notification.close();
    event.waitUntil(openInApp(link));
  });

  // Initialising messaging is all that's needed for background delivery.
  //
  // Deliberately NOT implemented here: onBackgroundMessage + showNotification().
  // The backend sends a `notification` payload, which this SDK already
  // displays. Showing it again would produce two notifications for one event.
  firebase.messaging();
} else {
  // Never throw here: an exception aborts installation, and the SDK then hands
  // back an undefined registration, which surfaces as a confusing
  // "Cannot read properties of undefined (reading 'pushManager')".
  console.warn(
    "[firebase-messaging-sw] Firebase config missing — push notifications disabled.",
  );
}

/**
 * Where a tapped notification should go, as an absolute URL. Firebase's carry
 * their payload under data.FCM_MSG (link in fcmOptions, path in data);
 * notifications the page raised itself carry `kinviaLink`.
 */
function notificationLink(notification) {
  const data = notification.data || {};
  if (data.kinviaLink) return data.kinviaLink;
  const fcm = data.FCM_MSG;
  if (!fcm) return null;
  const target =
    (fcm.fcmOptions && fcm.fcmOptions.link) ||
    (fcm.data && fcm.data.clickPath) ||
    "/";
  return new URL(target, self.location.origin).href;
}

async function openInApp(link) {
  const url = new URL(link);
  const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
  const existing = windows.find((client) => new URL(client.url).origin === url.origin);
  if (existing) {
    // This worker doesn't control the page (Workbox's does), so it can't
    // navigate it — the page does that itself on this message.
    await existing.focus();
    existing.postMessage({
      type: "kinvia-notification-click",
      path: url.pathname + url.search + url.hash,
    });
    return;
  }
  // Nothing open: a cold start loads the page fresh anyway.
  await clients.openWindow(link);
}
