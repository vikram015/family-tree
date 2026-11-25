import React, { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
} from "@mui/material";
import OutlinedFlagIcon from "@mui/icons-material/OutlinedFlag";
import { ApiService } from "../../services/apiService";
import { useAuth } from "../hooks/useAuth";

const REASONS = [
  "Offensive or abusive",
  "Spam or misleading",
  "Wrong or false information",
  "Privacy — shares someone's personal details",
  "Other",
];

interface ReportContentButtonProps {
  /** What is being reported, e.g. "business:<id>" or "wish:<id>". Stored as feedback context. */
  target: string;
  /** Shown in the dialog title: "Report this business". */
  label: string;
  variant?: "icon" | "text";
}

/**
 * Lets a signed-in user flag content for review (Play user-generated-content
 * policy). Reports land in the feedback table with category "report", which
 * superadmins already review in the admin panel.
 */
export const ReportContentButton: React.FC<ReportContentButtonProps> = ({
  target,
  label,
  variant = "icon",
}) => {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currentUser) return null;

  const close = () => {
    if (sending) return;
    setOpen(false);
    setSent(false);
    setError(null);
    setDetails("");
    setReason(REASONS[0]);
  };

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      await ApiService.submitFeedback({
        category: "report",
        message: details.trim() ? `${reason}: ${details.trim()}` : reason,
        context: target.slice(0, 255),
      });
      setSent(true);
    } catch (e: any) {
      setError(e?.message || "Could not send the report. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const title = `Report this ${label}`;

  return (
    <>
      {variant === "icon" ? (
        <Tooltip title={title}>
          <IconButton size="small" aria-label={title} onClick={() => setOpen(true)} sx={{ color: "text.secondary" }}>
            <OutlinedFlagIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          size="small"
          color="inherit"
          startIcon={<OutlinedFlagIcon />}
          onClick={() => setOpen(true)}
          sx={{ color: "text.secondary", textTransform: "none" }}
        >
          Report
        </Button>
      )}

      <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          {sent ? (
            <Alert severity="success">Thanks — our team will review it.</Alert>
          ) : (
            <>
              <RadioGroup value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS.map((r) => (
                  <FormControlLabel key={r} value={r} control={<Radio size="small" />} label={r} />
                ))}
              </RadioGroup>
              <TextField
                fullWidth
                multiline
                minRows={2}
                size="small"
                label="Details (optional)"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                inputProps={{ maxLength: 1000 }}
                sx={{ mt: 1 }}
              />
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={sending}>
            {sent ? "Close" : "Cancel"}
          </Button>
          {!sent && (
            <Button variant="contained" color="error" onClick={() => void submit()} disabled={sending}>
              {sending ? "Sending…" : "Send report"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReportContentButton;
