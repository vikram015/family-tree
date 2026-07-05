// Remembers where a login flow was initiated so the user can be returned to
// that page after authenticating (and after the onboarding detour, if any).
//
// We use sessionStorage rather than only router state because the target must
// survive the login -> onboarding -> destination hop, where router state on the
// original navigation is lost once the onboarding guard takes over.

const KEY = "postLoginRedirect";

/** Store the path to return to after login. Ignores login/onboarding routes. */
export function setPostLoginRedirect(path: string | null | undefined): void {
  if (!path) return;
  if (path.startsWith("/login") || path.startsWith("/onboarding")) return;
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    /* sessionStorage unavailable (private mode, etc.) — ignore */
  }
}

/** Store the redirect only if one isn't already remembered. */
export function setPostLoginRedirectIfAbsent(path: string | null | undefined): void {
  if (peekPostLoginRedirect()) return;
  setPostLoginRedirect(path);
}

/** Read the remembered path without clearing it. */
export function peekPostLoginRedirect(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Read and clear the remembered path. */
export function consumePostLoginRedirect(): string | null {
  const value = peekPostLoginRedirect();
  if (value) {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
  return value;
}
