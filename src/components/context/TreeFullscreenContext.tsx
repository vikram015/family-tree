import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Distraction-free mode for the family tree.
 *
 * Two independent layers, because neither alone is enough:
 *
 * 1. Hiding the app chrome (header + page header) — works everywhere, and on a
 *    phone reclaims roughly 145px, about 17% of the screen.
 * 2. The browser Fullscreen API — additionally hides the URL bar, worth another
 *    50-90px, but iPhone Safari does not implement it (iPad does). It is
 *    attempted and allowed to fail, so iOS still gets layer 1.
 *
 * State is app-level rather than local to the tree because the header that has
 * to disappear is rendered by App, well above the tree.
 */

interface TreeFullscreenContextType {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  exitFullscreen: () => void;
}

const TreeFullscreenContext = createContext<TreeFullscreenContextType>({
  isFullscreen: false,
  toggleFullscreen: () => {},
  exitFullscreen: () => {},
});

export const useTreeFullscreen = () => useContext(TreeFullscreenContext);

/** Native fullscreen, where the browser has it. Failure is expected on iPhone. */
async function requestNativeFullscreen() {
  try {
    const el = document.documentElement as any;
    const request =
      el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (request) await request.call(el);
  } catch {
    /* Unsupported or refused — layer 1 still applies. */
  }
}

async function exitNativeFullscreen() {
  try {
    const doc = document as any;
    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) return;
    const exit = doc.exitFullscreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
    if (exit) await exit.call(doc);
  } catch {
    /* Already out, or the browser declined. */
  }
}

export const TreeFullscreenProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
    void exitNativeFullscreen();
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((current) => {
      if (current) {
        void exitNativeFullscreen();
        return false;
      }
      // Must be called from the user gesture that triggered this.
      void requestNativeFullscreen();
      return true;
    });
  }, []);

  // The browser can leave fullscreen without us — Esc, a swipe, the OS. Follow
  // it, or the button would keep claiming the wrong state.
  useEffect(() => {
    const sync = () => {
      const doc = document as any;
      const nativeActive = Boolean(
        doc.fullscreenElement || doc.webkitFullscreenElement,
      );
      if (!nativeActive) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  // Android Back should leave fullscreen rather than the page — the same
  // history trick the dialogs use.
  useEffect(() => {
    if (!isFullscreen) return;
    window.history.pushState({ treeFullscreen: true }, "");
    const onPopState = () => {
      setIsFullscreen(false);
      void exitNativeFullscreen();
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      // Left some other way (the button, Esc) — pop the entry we added so the
      // history stays balanced. The listener is already detached, so this
      // cannot re-trigger the handler.
      if (window.history.state?.treeFullscreen) {
        window.history.back();
      }
    };
  }, [isFullscreen]);

  const value = useMemo(
    () => ({ isFullscreen, toggleFullscreen, exitFullscreen }),
    [isFullscreen, toggleFullscreen, exitFullscreen],
  );

  return (
    <TreeFullscreenContext.Provider value={value}>
      {children}
    </TreeFullscreenContext.Provider>
  );
};
