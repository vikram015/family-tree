/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

// Precaches the app shell (build assets) and serves index.html for navigation
// requests so the app loads offline. Data/API requests still require network.

import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

clientsClaim();

// Precache all assets injected by the build (self.__WB_MANIFEST is replaced at build time).
precacheAndRoute((self as any).__WB_MANIFEST || []);

// App-shell routing: navigation requests prefer a fresh index.html from the
// network (so a new deploy is visible on the very next normal page load, not
// just after the user notices and taps the update prompt), falling back to
// the cache only when offline. A pure cache-first handler here would keep
// re-serving the precached shell from install time indefinitely.
const fileExtensionRegexp = new RegExp("/[^/?]+\\.[^/]+$");
registerRoute(({ request, url }: { request: Request; url: URL }) => {
  if (request.mode !== "navigate") return false;
  if (url.pathname.startsWith("/_")) return false;
  if (url.pathname.match(fileExtensionRegexp)) return false;
  return true;
}, new NetworkFirst({
  cacheName: "start-url",
  networkTimeoutSeconds: 3,
}));

// Runtime cache for images served from the same origin.
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin && url.pathname.endsWith(".png"),
  new StaleWhileRevalidate({
    cacheName: "images",
    plugins: [new ExpirationPlugin({ maxEntries: 60 })],
  }),
);

// Allow the app to trigger an immediate update ("Reload" in the update prompt).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
