import React, { useEffect, useRef, useState } from "react";
import { Snackbar, Button, Alert } from "@mui/material";

/**
 * Shows a "new version available — Reload" prompt when the service worker has
 * installed an update. Reloading activates the waiting worker (SKIP_WAITING)
 * so users reliably pick up new deploys instead of a stale cached app.
 */
export const PwaUpdatePrompt: React.FC = () => {
  const [open, setOpen] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    const onUpdate = (event: Event) => {
      registrationRef.current = (event as CustomEvent).detail || null;
      setOpen(true);
    };
    window.addEventListener("sw-update-available", onUpdate);

    // When the new worker takes control, reload once to load fresh assets.
    const onControllerChange = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker?.addEventListener?.(
      "controllerchange",
      onControllerChange,
    );

    return () => {
      window.removeEventListener("sw-update-available", onUpdate);
      navigator.serviceWorker?.removeEventListener?.(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  const handleReload = () => {
    const waiting = registrationRef.current?.waiting;
    if (waiting) {
      waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
    setOpen(false);
  };

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ left: { xs: 16 }, right: { xs: 16 } }}
    >
      <Alert
        severity="info"
        variant="filled"
        action={
          <Button color="inherit" size="small" onClick={handleReload}>
            Reload
          </Button>
        }
        sx={{ width: "100%" }}
      >
        A new version is available.
      </Alert>
    </Snackbar>
  );
};
