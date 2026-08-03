import type { WishEventType } from '../services/apiService';

function browserOrigin(): string {
  return typeof window !== 'undefined' && window.location
    ? window.location.origin
    : '';
}

/**
 * Base host that serves the server-rendered `/share/person/:id` route with
 * Open Graph meta.
 *
 * Defaults to the SITE'S OWN ORIGIN: Firebase Hosting rewrites `/share/**` to
 * the Cloud Run service (see firebase.json), so shared links stay on kinvia.in
 * instead of exposing the *.run.app host. Serving the share page from the same
 * origin as the app is also what keeps `og:url` self-referential, which is what
 * makes Facebook use THIS page's preview image instead of re-scraping the SPA
 * and falling back to the generic site card.
 *
 * `REACT_APP_SHARE_BASE_URL` overrides it for local dev, where there is no
 * Hosting rewrite in front of the API.
 */
export const SHARE_BASE = (
  process.env.REACT_APP_SHARE_BASE_URL || browserOrigin()
).replace(/\/+$/, '');

/**
 * Build the shareable URL for a person's event thread.
 * e.g. `https://kinvia.in/share/person/<id>?event=birthday&year=2026`
 *
 * When the share host is NOT the current origin (local dev hitting the API
 * directly), we pass `origin` so the /share route redirects back to the exact
 * environment the user shared from. The backend validates it against its
 * allowlist before using it (open-redirect safe).
 */
export function buildEventShareUrl(
  personId: string,
  eventType: WishEventType,
  year: number,
): string {
  const base = SHARE_BASE;
  const current = browserOrigin();
  const origin =
    current && current !== base
      ? `&origin=${encodeURIComponent(current)}`
      : '';
  return `${base}/share/person/${personId}?event=${eventType}&year=${year}${origin}`;
}

export interface NativeShareInput {
  title: string;
  text: string;
  url: string;
}

/**
 * Share via the Web Share API when available, otherwise fall back to copying
 * the link to the clipboard. Resolves `true` when the action was handled.
 */
export async function shareEventNative({
  title,
  text,
  url,
}: NativeShareInput): Promise<boolean> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch {
      // User cancelled or share failed — treat as not handled.
      return false;
    }
  }
  return copyShareLink(url);
}

/** Open WhatsApp with a prefilled message + link. */
export function shareToWhatsApp(text: string, url: string): void {
  const shareText = encodeURIComponent(`${text} ${url}`);
  window.open(`https://wa.me/?text=${shareText}`, '_blank', 'noopener,noreferrer');
}

/** Open the Facebook sharer for the given URL. */
export function shareToFacebook(url: string): void {
  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    '_blank',
    'noopener,noreferrer',
  );
}

/** Copy the share link to the clipboard. Resolves `true` on success. */
export async function copyShareLink(url: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    // Fall through to failure.
  }
  return false;
}
