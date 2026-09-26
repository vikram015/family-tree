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

// Take over as soon as this worker installs, instead of sitting in "waiting"
// until every tab is closed. Without this a refresh does NOT swap workers, so
// the previous worker keeps serving its own precached (stale) app shell —
// which is how users stayed stuck on an old build across reloads. Paired with
// clientsClaim() below and the `controllerchange` reload in PwaUpdatePrompt,
// a new deploy now lands on the next visit without user action.
self.skipWaiting();
clientsClaim();

// App-shell routing: navigation requests prefer a fresh index.html from the
// network (so a new deploy is visible on the very next normal page load, not
// just after the user notices and taps the update prompt), falling back to
// the cache only when offline. A pure cache-first handler here would keep
// re-serving the precached shell from install time indefinitely.
//
// This MUST be registered before precacheAndRoute: Workbox matches routes in
// registration order, and the precache route resolves a navigation to "/" via
// its default `directoryIndex: "index.html"` — so precaching first would
// silently serve the precached shell cache-first and never reach this route.
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

// Precache all assets injected by the build (self.__WB_MANIFEST is replaced at build time).
// Hashed /static/** assets are served from here; navigations are handled above.
precacheAndRoute((self as any).__WB_MANIFEST || []);

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
