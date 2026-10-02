import { useSyncExternalStore } from "react";

/**
 * "Install the app" support, across the three ways browsers handle it.
 *
 * - Chrome / Edge / Samsung Internet (Android and desktop) fire
 *   `beforeinstallprompt`; holding on to that event lets us open the real
 *   install dialog from our own button.
 * - iOS has no install API at all, in any browser. The only way in is the
 *   Share sheet's "Add to Home Screen", so there we can only explain the steps.
 * - In-app browsers (WhatsApp, Instagram, Facebook…) can do neither; the user
 *   has to open the page in Safari/Chrome first.
 *
 * The event fires once, early in page load — often before the dashboard has
 * mounted — so the listener is attached when this module is first imported
 * (see index.tsx), not inside a component.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallPlatform =
  /** iPhone/iPad in Safari or another real browser: guide through Share. */
  | "ios"
  /** Inside WhatsApp/Instagram/Facebook etc.: must open in a browser first. */
  | "in-app"
  /** Android browser without an install prompt (Firefox, older Samsung…). */
  | "android"
  | "other";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Stop the browser's own mini-infobar; our button offers it instead.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });
}

/** Already running as the installed app (home-screen icon / app window). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    installed ||
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own flag, which predates display-mode support.
    (window.navigator as any).standalone === true
  );
}

export function detectInstallPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  // iPadOS 13+ reports itself as a Mac; the touch points give it away.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
  const isInApp = /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|Snapchat|LinkedInApp|; wv\)/i.test(ua);

  if (isInApp) return "in-app";
  if (isIOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

/**
 * Open the browser's install dialog. Resolves true if the user accepted.
 * The event is single-use, so it is dropped either way.
 */
export async function promptInstall(): Promise<boolean> {
  const prompt = deferredPrompt;
  if (!prompt) return false;
  deferredPrompt = null;
  notify();
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  if (outcome === "accepted") {
    installed = true;
    notify();
  }
  return outcome === "accepted";
}

type InstallState = {
  /** Installed already — show nothing. */
  standalone: boolean;
  /** The browser can open its own install dialog right now. */
  canPrompt: boolean;
  platform: InstallPlatform;
};

let snapshot: InstallState | null = null;
function getSnapshot(): InstallState {
  const next: InstallState = {
    standalone: isStandalone(),
    canPrompt: Boolean(deferredPrompt),
    platform: detectInstallPlatform(),
  };
  // useSyncExternalStore needs a stable object while nothing has changed.
  if (
    !snapshot ||
    snapshot.standalone !== next.standalone ||
    snapshot.canPrompt !== next.canPrompt ||
    snapshot.platform !== next.platform
  ) {
    snapshot = next;
  }
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallPrompt(): InstallState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
