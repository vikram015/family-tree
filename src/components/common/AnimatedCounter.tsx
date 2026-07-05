import React, { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  /** Final value to count up to. Accepts numeric strings (e.g. SQL bigint counts). */
  value: number | string;
  /** Animation duration in milliseconds. */
  duration?: number;
  /** When true, hold at 0 until loading completes (then animate). */
  loading?: boolean;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Counts up from 0 to `value` when it first becomes available (loading -> done),
 * and re-animates whenever the target value changes. Honors reduced-motion.
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1200,
  loading = false,
}) => {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    // While upstream data is still loading, keep the counter parked at 0.
    if (loading) {
      setDisplay(0);
      fromRef.current = 0;
      return;
    }

    // Counts arrive as strings from the API (SQL bigint), so coerce first.
    const numeric = Number(value);
    const target = Number.isFinite(numeric) ? numeric : 0;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || duration <= 0) {
      setDisplay(target);
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const current = Math.round(from + (target - from) * easeOutCubic(progress));
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration, loading]);

  return <>{display.toLocaleString()}</>;
};

export default AnimatedCounter;
