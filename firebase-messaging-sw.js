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

  // Initialising messaging is all that's needed for background delivery.
  //
  // Deliberately NOT implemented here:
  //  - onBackgroundMessage + showNotification(): the backend sends a
  //    `notification` payload, which this SDK already displays. Showing it
  //    again would produce two notifications for one event.
  //  - a custom `notificationclick` listener: firebase.messaging() registers
  //    its own (first, so it always runs first) which honours the absolute
  //    `webpush.fcmOptions.link` the backend sets, focusing an existing tab
  //    rather than opening a duplicate. A second listener would double-handle
  //    the click and could open an extra window.
  firebase.messaging();
} else {
  // Never throw here: an exception aborts installation, and the SDK then hands
  // back an undefined registration, which surfaces as a confusing
  // "Cannot read properties of undefined (reading 'pushManager')".
  console.warn(
    "[firebase-messaging-sw] Firebase config missing — push notifications disabled.",
  );
}
