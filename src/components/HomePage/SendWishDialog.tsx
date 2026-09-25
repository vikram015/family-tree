import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import { ApiService, WishEventType } from "../../services/apiService";
import { brand } from "../../theme/brand";
import { avatarTint, initialsOf } from "./homeTheme";

/**
 * Write a wish without leaving the dashboard.
 *
 * "Send wishes" used to open the recipient's profile page, which is where the
 * thread lives but also where every other fact about them lives — so the one
 * thing the button promised was buried, and the user lost the strip of cards
 * they were working through. On a morning with four birthdays that is four
 * round trips.
 *
 * The thread on the profile page is unchanged and still authoritative; this is
 * a second door to the same `POST /api/wishes`.
 */

export interface SendWishTarget {
  personId: string;
  name: string;
  photoUrl?: string | null;
  eventType: WishEventType;
  year: number;
}

export interface SendWishDialogProps {
  target: SendWishTarget | null;
  onClose: () => void;
  /** So the wall below can show what was just written, without a page reload. */
  onSent?: () => void;
}

/** Openers, so nobody faces an empty box. Tapping one fills the field. */
const SUGGESTIONS: Record<WishEventType, string[]> = {
  birthday: [
    "Happy birthday! Wishing you a wonderful year ahead. 🎂",
    "Many happy returns of the day!",
    "Happy birthday — hope we see you soon.",
  ],
  anniversary: [
    "Happy anniversary! Wishing you both many more years together.",
    "Congratulations on your anniversary! 💐",
  ],
  remembrance: [
    "Thinking of you today, and remembering them with love.",
    "Remembered always. 🙏",
  ],
};

const TITLE: Record<WishEventType, string> = {
  birthday: "Send birthday wishes",
  anniversary: "Send anniversary wishes",
  remembrance: "Share a remembrance",
};

const MAX_LENGTH = 500;

/**
 * A small curated palette rather than a picker library.
 *
 * Everything here is what people actually reach for on a birthday or an
 * anniversary; a full Unicode picker is a megabyte of dependency and a grid of
 * flags and office supplies nobody wants in a wish.
 */
const EMOJIS = [
  "🎂", "🎉", "🎁", "🥳", "✨", "🎈",
  "❤️", "💐", "🙏", "😊", "🤗", "👏",
  "💍", "💫", "🌸", "☀️", "🕊️", "🙌",
];

export const SendWishDialog: React.FC<SendWishDialogProps> = ({
  target,
  onClose,
  onSent,
}) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  /**
   * Insert at the caret, not at the end.
   *
   * Someone who has written a sentence and gone back to add a heart mid-way
   * expects it where the cursor is. The caret is then placed after what was
   * inserted so typing continues naturally.
   */
  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? message.length;
    const end = el?.selectionEnd ?? message.length;
    const next = (message.slice(0, start) + emoji + message.slice(end)).slice(0, MAX_LENGTH);
    setMessage(next);
    setError("");
    setEmojiAnchor(null);
    // After React has rewritten the value, or the caret snaps back to the end.
    window.requestAnimationFrame(() => {
      if (!el) return;
      const caret = Math.min(start + emoji.length, next.length);
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  // Reset per recipient, so a note meant for one person cannot be sent to the
  // next card the user opens.
  useEffect(() => {
    if (!target) return;
    setMessage("");
    setError("");
  }, [target]);

  const handleSend = async () => {
    if (!target) return;
    const text = message.trim();
    if (!text) {
      setError("Write something first.");
      return;
    }

    setSending(true);
    setError("");
    try {
      await ApiService.postWish({
        peopleId: target.personId,
        eventType: target.eventType,
        eventYear: target.year,
        message: text,
      });
      onSent?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to send wish:", err);
      setError(err?.message || "We couldn't send that. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!target) return null;

  const tint = avatarTint(target.name || target.personId);
  const suggestions = SUGGESTIONS[target.eventType] || SUGGESTIONS.birthday;

  return (
    <Dialog
      open
      onClose={sending ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>
        {TITLE[target.eventType] || "Send wishes"}
        <IconButton
          onClick={onClose}
          disabled={sending}
          aria-label="Close"
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
          <Avatar
            src={target.photoUrl || undefined}
            alt={target.name}
            sx={{ width: 48, height: 48, bgcolor: tint.bg, color: tint.fg, fontWeight: 700 }}
          >
            {initialsOf(target.name) || "?"}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, color: brand.ink }}>{target.name}</Typography>
            <Typography sx={{ fontSize: 13, color: brand.slateMuted }}>
              Your note appears on their wall, signed with your name.
            </Typography>
          </Box>
        </Stack>

        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          maxRows={8}
          value={message}
          inputRef={inputRef}
          onChange={(e) => {
            setMessage(e.target.value.slice(0, MAX_LENGTH));
            setError("");
          }}
          placeholder="Write your message…"
          helperText={`${message.length}/${MAX_LENGTH}`}
          FormHelperTextProps={{ sx: { textAlign: "right", m: 0, mt: 0.5 } }}
        />

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          <Tooltip title="Add an emoji">
            <IconButton
              onClick={(e) => setEmojiAnchor(e.currentTarget)}
              aria-label="Add an emoji"
              size="small"
              sx={{ color: brand.slateMuted }}
            >
              <SentimentSatisfiedAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography sx={{ fontSize: 12.5, color: brand.slateMuted }}>
            Add an emoji, or tap a suggestion below.
          </Typography>
        </Stack>

        <Popover
          open={Boolean(emojiAnchor)}
          anchorEl={emojiAnchor}
          onClose={() => setEmojiAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: "left" }}
          transformOrigin={{ vertical: "bottom", horizontal: "left" }}
          PaperProps={{ sx: { borderRadius: 2, p: 1 } }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 0.25,
            }}
          >
            {EMOJIS.map((emoji) => (
              <IconButton
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                aria-label={`Insert ${emoji}`}
                sx={{ fontSize: 20, width: 40, height: 40, borderRadius: 1.5 }}
              >
                {emoji}
              </IconButton>
            ))}
          </Box>
        </Popover>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
          {suggestions.map((suggestion) => (
            <Chip
              key={suggestion}
              label={suggestion}
              onClick={() => setMessage(suggestion)}
              sx={{
                borderRadius: 1.5,
                bgcolor: "#f1f5f9",
                fontWeight: 600,
                fontSize: 12.5,
                height: "auto",
                py: 0.75,
                cursor: "pointer",
                "& .MuiChip-label": { whiteSpace: "normal", display: "block" },
              }}
            />
          ))}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={sending} sx={{ textTransform: "none", fontWeight: 700 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={sending || !message.trim()}
          startIcon={sending ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{
            textTransform: "none",
            fontWeight: 800,
            borderRadius: 2,
            px: 3,
            bgcolor: brand.primaryDark,
            "&:hover": { bgcolor: "#1e40af" },
          }}
        >
          {sending ? "Sending…" : "Send"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SendWishDialog;
