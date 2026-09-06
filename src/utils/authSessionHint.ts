/**
 * A synchronously-readable hint about whether the last visit on this browser
 * ended signed in.
 *
 * Firebase restores a persisted session from IndexedDB asynchronously, so on a
 * cold load there is a short window where the app genuinely does not know who
 * the user is. Rendering the signed-out view during that window and swapping it
 * for the dashboard a moment later is jarring, and blocking the whole page on a
 * spinner penalises anonymous visitors — who are the common case for a cold
 * load. This hint lets the first paint match the outcome for both:
 * returning users get the dashboard shell, everyone else the landing page.
 *
 * It is a hint, not a source of truth: it can be stale (session expired,
 * signed out elsewhere). Never gate data or permissions on it — only the
 * placeholder we show until `onIdTokenChanged` reports for the first time.
 */
const STORAGE_KEY = "kinvia:hadSession";

export function readSessionHint(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private mode / storage disabled — fall back to the anonymous view.
    return false;
  }
}

export function writeSessionHint(hasSession: boolean): void {
  try {
    if (hasSession) {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Best-effort only: the hint is a rendering optimisation.
  }
}
