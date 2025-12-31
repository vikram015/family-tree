import React, { useEffect, useRef } from "react";
import classNames from "classnames";
import { create } from "pinch-zoom-pan";

import css from "./PinchZoomPan.module.css";

interface PinchZoomPanProps {
  min?: number;
  max?: number;
  captureWheel?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const PinchZoomPan = React.memo(function PinchZoomPan({
  min,
  max,
  captureWheel,
  className,
  style,
  children,
}: PinchZoomPanProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const canvas = create({
      element,
      minZoom: min,
      maxZoom: max,
      captureWheel,
    });

    // iOS/Safari fallback: ensure we can prevent default scrolling/zooming
    const preventTouchMove = (e: TouchEvent) => {
      // Prevent page scroll when interacting inside the canvas
      if (e.touches && e.touches.length >= 1) e.preventDefault();
    };
    const preventGesture = (e: Event) => {
      // Prevent Safari page gesture zoom from interfering
      e.preventDefault();
    };
    element.addEventListener("touchmove", preventTouchMove, { passive: false });
    // Non-standard but useful on Safari
    element.addEventListener(
      "gesturestart",
      preventGesture as EventListener,
      { passive: false } as any
    );
    element.addEventListener(
      "gesturechange",
      preventGesture as EventListener,
      { passive: false } as any
    );
    element.addEventListener(
      "gestureend",
      preventGesture as EventListener,
      { passive: false } as any
    );

    return () => {
      canvas.destroy();
      element.removeEventListener(
        "touchmove",
        preventTouchMove as EventListener
      );
      element.removeEventListener(
        "gesturestart",
        preventGesture as EventListener
      );
      element.removeEventListener(
        "gesturechange",
        preventGesture as EventListener
      );
      element.removeEventListener(
        "gestureend",
        preventGesture as EventListener
      );
    };
  }, [min, max, captureWheel]);

  return (
    <div ref={root} className={classNames(className, css.root)} style={style}>
      <div className={css.point}>
        <div className={css.canvas}>{children}</div>
      </div>
    </div>
  );
});
