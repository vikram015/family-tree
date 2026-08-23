import React, { createContext, useCallback, useContext, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import { pushNotifications } from "../../services/pushNotifications";

/**
 * Contextual "soft prompt" for enabling push notifications.
 *
 * Call `offerNotifications(reason)` right after an action whose outcome the
 * user will want to hear about (raising a request, sending an invite). It shows
 * our own dialog first; the real browser permission prompt only fires when the
 * user clicks Enable.
 *
 * Why the two-step: Safari and Firefox require a user gesture, so a permission
 * request fired straight after an async action wouldn't show a dialog at all.
 * And the browser decision is one-shot — a reflexive "Block" is permanent and
 * unrecoverable from inside the app — so it's worth spending our own dialog to
 * make sure the real prompt only appears when the user has said yes.
 */

interface NotificationPromptContextType {
  /**
   * Offers to turn on notifications. No-ops when they're already on, when the
   * user has blocked them, when the browser can't do push, or when the user
   * recently said "not now".
   */
  offerNotifications: (reason: string) => void;
}

const NotificationPromptContext = createContext<NotificationPromptContextType>({
  offerNotifications: () => {},
});

export const useNotificationPrompt = () => useContext(NotificationPromptContext);

/** Don't re-ask for this long after a "Not now". */
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const SNOOZE_KEY = "kinvia.notifyPromptSnoozedUntil";

function isSnoozed(): boolean {
  try {
    const until = Number(window.localStorage.getItem(SNOOZE_KEY) || 0);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    // Private mode — we just ask again next time.
  }
}

export const NotificationPromptProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [reason, setReason] = useState<string | null>(null);
  const [enabling, setEnabling] = useState(false);

  const offerNotifications = useCallback((nextReason: string) => {
    if (isSnoozed()) return;

    // Only "default" is askable: "granted" needs nothing, and "denied" can only
    // be undone in browser settings, so prompting again would be a dead end.
    void pushNotifications.getPermissionState().then((state) => {
      if (state === "default") {
        setReason(nextReason);
      }
    });
  }, []);

  const handleClose = useCallback(() => {
    snooze();
    setReason(null);
  }, []);

  const handleEnable = useCallback(async () => {
    setEnabling(true);
    try {
      // Runs inside the click handler, so the browser sees a user gesture.
      await pushNotifications.register({ promptIfNeeded: true });
    } finally {
      setEnabling(false);
      setReason(null);
    }
  }, []);

  return (
    <NotificationPromptContext.Provider value={{ offerNotifications }}>
      {children}
      <Dialog open={Boolean(reason)} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <NotificationsActiveOutlinedIcon color="primary" />
            Stay updated?
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{reason}</DialogContentText>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Your browser will ask for permission. You can turn notifications off
            any time from your profile.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={enabling}>
            Not now
          </Button>
          <Button variant="contained" onClick={() => void handleEnable()} disabled={enabling}>
            {enabling ? "Enabling…" : "Enable notifications"}
          </Button>
        </DialogActions>
      </Dialog>
    </NotificationPromptContext.Provider>
  );
};

export default NotificationPromptProvider;
