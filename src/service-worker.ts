/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

// Precaches the app shell (build assets) and serves index.html for navigation
// requests so the app loads offline. Data/API requests still require network.

import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

clientsClaim();

// Precache all assets injected by the build (self.__WB_MANIFEST is replaced at build time).
precacheAndRoute((self as any).__WB_MANIFEST || []);

// App-shell routing: send navigation requests to the cached index.html.
const fileExtensionRegexp = new RegExp("/[^/?]+\\.[^/]+$");
registerRoute(({ request, url }: { request: Request; url: URL }) => {
  if (request.mode !== "navigate") return false;
  if (url.pathname.startsWith("/_")) return false;
  if (url.pathname.match(fileExtensionRegexp)) return false;
  return true;
}, createHandlerBoundToURL(process.env.PUBLIC_URL + "/index.html"));

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
