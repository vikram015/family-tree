import { useEffect, useRef } from "react";

/**
 * Auto-fetches an incoming SMS OTP using the WebOTP API
 * (`navigator.credentials.get({ otp: { transport: ["sms"] } })`).
 *
 * Supported on Android Chrome (and Chromium browsers). On unsupported browsers
 * (iOS Safari, desktop) it silently no-ops — those still get the native
 * suggestion via `autocomplete="one-time-code"` on the input.
 *
 * Requirements for the code to be delivered:
 * - The page must be a secure context (HTTPS or localhost).
 * - The SMS must end with an origin-bound line, e.g. `@your-domain.com #123456`.
 *   This is configured in the SMS template (Firebase phone-auth), not here.
 *
 * @param enabled   Start listening only while the OTP step is visible.
 * @param onReceive Called with the numeric code once the SMS is read.
 * @param maxLength Optional cap on the returned digits (defaults to the full code).
 */
export function useSmsOtpAutofill(
  enabled: boolean,
  onReceive: (code: string) => void,
  maxLength?: number,
) {
  // Keep the latest callback without re-subscribing (which would abort the
  // in-flight WebOTP request on every parent render).
  const onReceiveRef = useRef(onReceive);
  onReceiveRef.current = onReceive;

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!("OTPCredential" in window)) return; // Unsupported browser.
    if (!window.isSecureContext) return; // WebOTP requires HTTPS/localhost.

    const abortController = new AbortController();
    let cancelled = false;

    (navigator.credentials as any)
      .get({
        otp: { transport: ["sms"] },
        signal: abortController.signal,
      })
      .then((credential: { code?: string } | null) => {
        if (cancelled || !credential?.code) return;
        const digits = String(credential.code).replace(/\D/g, "");
        if (!digits) return;
        onReceiveRef.current(maxLength ? digits.slice(0, maxLength) : digits);
      })
      .catch(() => {
        // Aborted (step closed), timed out, or dismissed — nothing to do.
      });

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [enabled, maxLength]);
}
