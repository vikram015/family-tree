import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The viewer's coordinates, for ranking business results by distance.
 *
 * Deliberately opt-in. A permission prompt on page load is hostile and, in
 * Chrome, a dismissed prompt is remembered as a refusal — so the browser is
 * only asked once the user turns "Near me" on. The answer is remembered across
 * visits so they are asked at most once.
 *
 * Everything degrades: no permission, no support, or a timeout all leave
 * `coords` null, and search simply runs without proximity ranking.
 */

const STORAGE_KEY = "kinvia:nearMe";

/** Coordinates go stale as people move; re-ask rather than rank off yesterday. */
const MAX_AGE_MS = 10 * 60 * 1000;

export interface NearMeState {
  /** Whether the user has asked for nearby results. */
  enabled: boolean;
  coords: { latitude: number; longitude: number } | null;
  /** True while the browser prompt is open or a fix is being acquired. */
  locating: boolean;
  /** Set when the browser refused or failed; shown as a hint, never a blocker. */
  error: string;
  toggle: () => void;
}

function readStoredPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private mode / blocked storage: default to off.
    return false;
  }
}

function writeStoredPreference(enabled: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    // Not worth surfacing — the toggle still works for this session.
  }
}

export function useNearMe(): NearMeState {
  const [enabled, setEnabled] = useState<boolean>(() => readStoredPreference());
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const fetchedAtRef = useRef(0);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("This browser can't share your location.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchedAtRef.current = Date.now();
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocating(false);
      },
      (positionError) => {
        setLocating(false);
        setCoords(null);
        setError(
          positionError.code === positionError.PERMISSION_DENIED
            ? "Location access is blocked, so results aren't sorted by distance."
            : "We couldn't get your location, so results aren't sorted by distance.",
        );
      },
      // Low accuracy is plenty: results are ranked against village centroids,
      // and the high-accuracy path costs battery and seconds for no gain.
      { enableHighAccuracy: false, timeout: 8000, maximumAge: MAX_AGE_MS },
    );
  }, []);

  // Re-acquire when enabled, and when the fix has aged out.
  useEffect(() => {
    if (!enabled) {
      setCoords(null);
      setError("");
      return;
    }
    if (coords && Date.now() - fetchedAtRef.current < MAX_AGE_MS) return;
    locate();
  }, [enabled, coords, locate]);

  const toggle = useCallback(() => {
    setEnabled((previous) => {
      const next = !previous;
      writeStoredPreference(next);
      return next;
    });
  }, []);

  return { enabled, coords, locating, error, toggle };
}

export default useNearMe;
