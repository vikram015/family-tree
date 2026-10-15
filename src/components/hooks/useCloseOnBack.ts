import { useEffect, useRef } from "react";

/**
 * React Router's own fields in `history.state`: its position (`idx`), entry key
 * and the location state passed to `navigate`.
 *
 * Anything that pushes a raw history entry (so the phone's Back closes an
 * overlay) must carry these over. The router computes the next position from
 * the current entry's `idx`, and a location's state is read back from `usr` —
 * an entry without them leaves the next navigation at index NaN and drops the
 * state a page was opened with (e.g. the tree's "came from the list" flag).
 *
 * Only these are copied, not the whole state, so a stacked overlay doesn't
 * inherit the marker of the one beneath it.
 */
export function routerHistoryState(): Record<string, unknown> {
  const state = window.history.state || {};
  const { usr, key, idx } = state as { usr?: unknown; key?: unknown; idx?: unknown };
  return { usr, key, idx };
}

/** Set on an overlay's entry once it has closed without Back popping it. */
const ORPHAN = "kinviaOrphanEntry";

/**
 * Pushes an overlay's history entry — or, when the entry on top belongs to an
 * overlay that just closed in the same render (a sheet's "Edit" handing over
 * to the edit drawer), takes that entry over instead. Otherwise the closed
 * overlay's entry would sit stranded beneath the new one and cost a dead Back
 * press later.
 */
export function pushOverlayEntry(marker: string) {
  const entry = { ...routerHistoryState(), [marker]: true };
  if (window.history.state?.[ORPHAN]) {
    window.history.replaceState(entry, "");
  } else {
    window.history.pushState(entry, "");
  }
}

/**
 * Makes the phone's Back button close an overlay (sheet, drawer) instead of
 * leaving the page underneath it.
 *
 * While `open`, a history entry carrying `marker` sits on top of the page's
 * own. Back pops it and `onClose` runs. Closed any other way, the entry is
 * popped for it so the next Back isn't a dead press — or handed to the overlay
 * opening in its place (see `pushOverlayEntry`). If a navigation has already
 * been pushed past it, it is left alone rather than popping that.
 */
export function useCloseOnBack(open: boolean, onClose: () => void, marker: string) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    pushOverlayEntry(marker);
    let closedByBack = false;
    const onPopState = () => {
      // Every Back fires this. Only act when it popped our entry — not when it
      // closed something stacked above us and landed back on ours.
      if (window.history.state?.[marker]) return;
      closedByBack = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
      if (closedByBack) return;
      // Still our entry on top (nothing navigated past it): mark it orphaned.
      // If another overlay opens in this same commit it takes the entry over;
      // if not, it is popped a tick later so the next Back isn't a dead press.
      if (!window.history.state?.[marker]) return;
      window.history.replaceState({ ...routerHistoryState(), [ORPHAN]: true }, "");
      window.setTimeout(() => {
        if (window.history.state?.[ORPHAN]) window.history.back();
      }, 0);
    };
  }, [open, marker]);
}

/**
 * Whether the current history entry is an overlay's (see `useCloseOnBack`).
 * A link inside that overlay should navigate with `replace`, swapping the
 * overlay's entry for the destination instead of stacking on top of it.
 */
export function isOverlayEntry(marker: string): boolean {
  return Boolean(window.history.state?.[marker]);
}
