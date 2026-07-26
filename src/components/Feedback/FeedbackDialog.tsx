import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Rating,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ApiService } from "../../services/apiService";

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called after feedback is successfully submitted (e.g. to show a snackbar). */
  onSubmitted?: () => void;
}

const CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "suggestion", label: "Suggestion" },
  { value: "other", label: "Other" },
];

/**
 * Collect free-form user feedback (category, optional rating, required message).
 * Auto-captures the current page path as context. Controlled via open/onClose.
 */
export function FeedbackDialog({ open, onClose, onSubmitted }: FeedbackDialogProps) {
  const [category, setCategory] = useState<string>("suggestion");
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (!open) return;
    setCategory("suggestion");
    setRating(null);
    setMessage("");
    setError("");
  }, [open]);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSaving(true);
    setError("");
    try {
      await ApiService.submitFeedback({
        message: message.trim(),
        category,
        rating: rating ?? null,
        context: window.location.pathname || null,
      });
      onClose();
      onSubmitted?.();
    } catch (err: any) {
      setError(err?.message || "Failed to submit feedback.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      fullScreen={isMobile}
    >
      <DialogTitle>Send feedback</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                What kind of feedback?
              </Typography>
              <ToggleButtonGroup
                value={category}
                exclusive
                fullWidth
                size="small"
                onChange={(_e, value) => {
                  if (value) setCategory(value);
                }}
              >
                {CATEGORIES.map((c) => (
                  <ToggleButton key={c.value} value={c.value} sx={{ textTransform: "none" }}>
                    {c.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Rate your experience (optional)
              </Typography>
              <Rating
                value={rating}
                onChange={(_e, value) => setRating(value)}
              />
            </Box>

            <TextField
              fullWidth
              required
              multiline
              minRows={4}
              label="Your feedback"
              placeholder="Tell us what's on your mind…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving || !message.trim()}
        >
          {saving ? "Sending..." : "Send"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default FeedbackDialog;
