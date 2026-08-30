#!/usr/bin/env node
/**
 * Writes public/firebase-messaging-config.js from the REACT_APP_FIREBASE_*
 * environment variables.
 *
 * Why this exists: the FCM service worker lives in public/, which CRA copies
 * verbatim — no process.env substitution — so it cannot read the config the way
 * the app does. Passing the config as query params on the registration URL does
 * NOT work either: the Firebase SDK falls back to registering the bare
 * DEFAULT_SW_PATH ("/firebase-messaging-sw.js", no query string) whenever it
 * needs a registration it doesn't already hold (e.g. deleteToken after a page
 * reload). That query-less registration would leave the worker with a null
 * config and break it.
 *
 * Generating a real file sidesteps all of that: the worker imports it and works
 * no matter who registers it.
 *
 * Run before every build/start — see the npm scripts.
 */
const fs = require("fs");
const path = require("path");

const KEYS = [
  "REACT_APP_FIREBASE_API_KEY",
  "REACT_APP_FIREBASE_AUTH_DOMAIN",
  "REACT_APP_FIREBASE_PROJECT_ID",
  "REACT_APP_FIREBASE_STORAGE_BUCKET",
  "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
  "REACT_APP_FIREBASE_APP_ID",
];

/**
 * Mirrors the files CRA itself loads, so `npm start` (which has no env-cmd)
 * produces the same config the app is built with. Values already present in
 * process.env win — that's the `env-cmd -f .env.<mode>` path used by
 * build:prod / build:dev.
 */
function loadEnvFiles() {
  const mode = process.env.REACT_APP_ENV_MODE || process.env.NODE_ENV || "development";
  const root = path.resolve(__dirname, "..");
  const candidates = [
    `.env.${mode}.local`,
    `.env.${mode}`,
    ".env.local",
    ".env",
  ];

  for (const file of candidates) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    const parsed = require("dotenv").parse(fs.readFileSync(full));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

loadEnvFiles();

const config = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "",
};

const missing = KEYS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // Not fatal: push is optional, and the worker degrades to a no-op. But this
  // is silent at runtime, so make it loud at build time.
  console.warn(
    `[messaging-config] WARNING: missing ${missing.join(", ")} — ` +
      "push notifications will not work in this build.",
  );
}

const output = `// GENERATED FILE — do not edit.
// Written by scripts/generate-messaging-config.js from REACT_APP_FIREBASE_* env vars.
self.__FIREBASE_CONFIG__ = ${JSON.stringify(config, null, 2)};
`;

const target = path.resolve(__dirname, "..", "public", "firebase-messaging-config.js");
fs.writeFileSync(target, output);
console.log(
  `[messaging-config] wrote ${path.relative(process.cwd(), target)} for project "${config.projectId || "<unset>"}"`,
);
