/**
 * The browser's position, but only when the user has already granted access.
 *
 * Calling `getCurrentPosition` unconditionally would raise a permission prompt
 * on page load, which is hostile and — in Chrome — counterproductive: a
 * dismissed prompt is remembered as a refusal, so asking at the wrong moment
 * costs the capability permanently. The Permissions API lets us check the
 * answer without asking the question.
 *
 * Returns null for every uncertain case (no support, permission "prompt" or
 * "denied", a timeout, an error). Callers treat null as "no signal" and fall
 * back to whatever they were doing before.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** A fix this old is good enough for choosing a village. */
const MAX_AGE_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 8000;

export async function getAlreadyGrantedPosition(): Promise<Coordinates | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  // Without the Permissions API we cannot tell a granted permission from an
  // unasked one, and guessing would risk the prompt this function exists to
  // avoid. Safari historically lacked it; there, this simply returns null.
  if (!navigator.permissions?.query) return null;

  try {
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    if (status.state !== "granted") return null;
  } catch {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve(null),
      // Low accuracy on purpose: the answer is matched to a village centroid,
      // so the high-accuracy path would cost battery and seconds for no gain.
      { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: MAX_AGE_MS },
    );
  });
}

/**
 * Ask for location access explicitly, in response to a user action.
 *
 * This is the one place allowed to raise the browser prompt, because a person
 * just clicked a button that says it will. Resolves null if they refuse.
 */
export async function requestPosition(): Promise<Coordinates | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: MAX_AGE_MS },
    );
  });
}

export default getAlreadyGrantedPosition;
