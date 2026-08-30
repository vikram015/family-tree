/**
 * Pre-launch gate.
 *
 * While `VITE_COMING_SOON` is `true`, the app renders only the
 * "launching soon" page — no routes, no auth, no data fetching. To remove the
 * gate at launch, set the flag to `false` (or delete it) in `.env.production`
 * and redeploy; nothing else needs to change.
 *
 * NOTE: this is a visibility switch, not a security boundary. The public GET
 * endpoints on the API stay reachable regardless — it only controls what the
 * website shows.
 */

const PREVIEW_PARAM = 'preview';
const PREVIEW_STORAGE_KEY = 'kinvia.previewAccess';

function flagEnabled(): boolean {
  return import.meta.env.VITE_COMING_SOON === 'true';
}

/**
 * Team bypass, so the real site stays usable while the gate is up:
 * `?preview=1` unlocks this browser (remembered via localStorage),
 * `?preview=off` locks it again.
 */
function hasPreviewAccess(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(PREVIEW_STORAGE_KEY);
  } catch {
    // Private mode / storage disabled — fall back to the URL param only.
  }

  const requested = new URLSearchParams(window.location.search).get(PREVIEW_PARAM);

  if (requested === 'off') {
    try {
      window.localStorage.removeItem(PREVIEW_STORAGE_KEY);
    } catch {
      // Ignore — nothing to clear.
    }
    return false;
  }

  if (requested) {
    try {
      window.localStorage.setItem(PREVIEW_STORAGE_KEY, '1');
    } catch {
      // Not persisted, but honour it for this page load.
    }
    return true;
  }

  return stored === '1';
}

/** True when the visitor should see the launching-soon page instead of the app. */
export function shouldShowComingSoon(): boolean {
  return flagEnabled() && !hasPreviewAccess();
}
