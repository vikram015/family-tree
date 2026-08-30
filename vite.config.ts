import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  // `VITE_ENV_MODE` mirrors the old CRA env-mode switch and is read by the
  // messaging-config script, so it is loaded here too for parity.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      VitePWA({
        // The app owns its service worker (Workbox routes for API, images and
        // navigation), so Vite injects the precache manifest into that file
        // rather than generating a worker from scratch.
        strategies: "injectManifest",
        srcDir: "src",
        filename: "service-worker.ts",
        registerType: "prompt",
        injectRegister: null, // registration is handled by serviceWorkerRegistration.ts
        manifest: false, // public/manifest.json is authored by hand
        injectManifest: {
          // The FCM worker and its generated config are served as-is from
          // public/ and must not be precached or fingerprinted.
          globIgnores: ["**/firebase-messaging-sw.js", "**/firebase-messaging-config.js"],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        devOptions: {
          // Keep the dev server free of service-worker caching; the worker is a
          // production concern and stale caches make local debugging painful.
          enabled: false,
        },
      }),
    ],
    server: {
      port: 3000,
      host: true, // keeps LAN access working, as CRA's HOST=0.0.0.0 did
    },
    preview: {
      port: 3000,
    },
    build: {
      outDir: "build", // firebase.json and the deploy scripts expect build/
      sourcemap: mode !== "production",
      rollupOptions: {
        output: {
          // Split the big, rarely-changing dependencies into their own chunks.
          // CRA shipped one monolithic bundle, so any app change invalidated the
          // whole thing in every browser cache; these boundaries mean a code
          // change no longer re-downloads React, MUI, Firebase and D3.
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom", "react-redux", "@reduxjs/toolkit"],
            mui: ["@mui/material", "@mui/icons-material", "@mui/x-date-pickers"],
            firebase: ["firebase/app", "firebase/auth", "firebase/messaging"],
            d3: ["d3-selection", "d3-hierarchy", "d3-shape", "d3-transition", "d3-zoom"],
          },
        },
      },
    },
    define: {
      // A few libraries still reference process.env at runtime; give them an
      // object rather than letting the reference throw in the browser.
      "process.env.NODE_ENV": JSON.stringify(
        mode === "production" ? "production" : "development",
      ),
    },
  };
});
