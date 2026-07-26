import type { WishEventType } from '../services/apiService';

/**
 * Base host that serves the server-rendered `/share/person/:id` route with
 * Open Graph meta (the Cloud Run API host). Shared links point here so
 * WhatsApp/Facebook can render a rich preview before redirecting to the SPA.
 */
export const SHARE_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  '';

/**
 * Build the shareable URL for a person's event thread.
 * e.g. `${SHARE_BASE}/share/person/<id>?event=birthday&year=2026&origin=<frontend origin>`
 *
 * We pass the current browser origin so the /share route redirects back to the
 * exact environment the user shared from (localhost, staging, prod) instead of
 * relying on a backend-configured URL. The backend validates this origin
 * against its allowlist before using it (open-redirect safe).
 */
export function buildEventShareUrl(
  personId: string,
  eventType: WishEventType,
  year: number,
): string {
  const base = SHARE_BASE.replace(/\/+$/, '');
  const origin =
    typeof window !== 'undefined' && window.location
      ? `&origin=${encodeURIComponent(window.location.origin)}`
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
