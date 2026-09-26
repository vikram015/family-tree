import React, { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ReplyIcon from "@mui/icons-material/ReplyOutlined";
import { Link } from "react-router-dom";
import {
  CelebrationEventType,
  CelebrationWish,
  ReactionKind,
} from "../../services/apiService";
import { brand } from "../../theme/brand";
import { avatarTint, initialsOf } from "../HomePage/homeTheme";
import { cardSx, timeAgo, toneFor } from "./celebrationTheme";

/**
 * The guestbook: messages, the replies under them, and reactions on both.
 *
 * Each entry carries two answers to "who is this?": what the author typed, and
 * what the tree worked out. They are shown together and marked differently —
 * the resolved one as a solid chip because the app is standing behind it, the
 * self-declared one as plain muted text because it is a claim. Where they agree
 * only one is shown; there is no value in "Grandson · Grandson".
 */

/**
 * The three reactions, in the order they are offered.
 *
 * Chosen to work on all three kinds of celebration: a birthday, an anniversary
 * and a memorial all accept a heart, a pranam and a note of warmth, whereas
 * anything celebratory would be wrong on a remembrance. The glyph lives here,
 * not in the database — see migration 033.
 *
 * A person picks one of these per message, not several — see migration 035.
 */
const REACTIONS: { kind: ReactionKind; emoji: string; label: string }[] = [
  { kind: "heart", emoji: "❤️", label: "Love" },
  { kind: "pranam", emoji: "🙏", label: "Pranam" },
  { kind: "warmth", emoji: "✨", label: "Warmth" },
];

export interface WishStreamProps {
  wishes: CelebrationWish[];
  eventType: CelebrationEventType;
  /** Only family get names linked through to profiles. */
  isFamily: boolean;
  /** Reacting and replying both need an account. */
  canInteract: boolean;
  onDelete: (wishId: string) => void;
  onEdit: (wishId: string, message: string) => Promise<void>;
  onReact: (wishId: string, kind: ReactionKind) => void;
  onReply: (parentWishId: string, message: string) => Promise<void>;
  /** Opens the login modal, resuming `onSuccess` once signed in. */
  onRequestSignIn: (onSuccess?: () => void) => void;
}

/**
 * Whether a time-limited permission is still open, re-evaluated when it lapses.
 *
 * The server decides this at load, but a celebration page is the kind of thing
 * that sits open in a tab. Without this, a pencil posted at 10:59 would still
 * be on screen at 12:30 and the server would refuse it — an action offered and
 * then denied is worse than one never offered. A single timer per message,
 * cleared on unmount, set only while a deadline is actually pending.
 */
function useStillWithinWindow(expiresAt: string | null, granted: boolean): boolean {
  const deadline = expiresAt ? new Date(expiresAt).getTime() : null;
  const [open, setOpen] = useState(
    () => granted && (deadline === null || deadline > Date.now()),
  );

  useEffect(() => {
    if (!granted) {
      setOpen(false);
      return;
    }
    // No deadline means the permission does not expire (a superadmin's).
    if (deadline === null) {
      setOpen(true);
      return;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      setOpen(false);
      return;
    }
    setOpen(true);
    const timer = window.setTimeout(() => setOpen(false), remaining);
    return () => window.clearTimeout(timer);
  }, [deadline, granted]);

  return open;
}

/** Whether the typed and resolved labels are saying the same thing. */
function sameRelation(typed: string | null, resolved: string | null): boolean {
  if (!typed || !resolved) return false;
  return typed.trim().toLowerCase() === resolved.trim().toLowerCase();
}

/**
 * The reaction row.
 *
 * One pill per kind, and at most one of them can be chosen — a person gets a
 * single reaction per message.
 *
 * The chosen pill is marked with the palest blue fill plus a coloured border
 * and darker text, not a solid one. A saturated fill made three small pills
 * under every message the loudest thing on the page, competing with the message
 * itself; the border and the text weight carry the distinction at a fraction of
 * the volume. Border width stays at 1px in both states so selecting a pill does
 * not nudge the row.
 */
const ReactionBar: React.FC<{
  wish: CelebrationWish;
  canInteract: boolean;
  onReact: (kind: ReactionKind) => void;
  onRequestSignIn: (onSuccess?: () => void) => void;
}> = ({ wish, canInteract, onReact, onRequestSignIn }) => {
  const tallies = wish.reactions || [];
  const mine = tallies.find((entry) => entry.reacted)?.kind ?? null;

  return (
    <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
      {REACTIONS.map(({ kind, emoji, label }) => {
        const tally = tallies.find((entry) => entry.kind === kind);
        const count = tally?.count || 0;
        const chosen = mine === kind;

        return (
          <Box
            key={kind}
            component="button"
            type="button"
            aria-pressed={chosen}
            // The pill shows an emoji and a number, so the name of the reaction
            // lives only here. It was also in a tooltip; without that, this is
            // the only thing a screen reader has to go on.
            aria-label={label}
            // Signing in resumes the tap rather than dropping it — the point
            // of the prompt was to let this reaction happen.
            onClick={() =>
              canInteract ? onReact(kind) : onRequestSignIn(() => onReact(kind))
            }
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.25,
              minHeight: 28,
              borderRadius: 999,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1,
              border: "1px solid",
              // Unselected pills sit on the same soft ground as the rest of the
              // card's inset surfaces rather than floating transparent, which
              // is what made them read as unfinished next to the message.
              borderColor: chosen ? brand.primary : "transparent",
              bgcolor: chosen ? brand.primarySoft : brand.canvas,
              color: chosen ? brand.primaryDark : brand.slate,
              transition:
                "background-color 120ms ease, border-color 120ms ease, color 120ms ease",
              "&:hover": {
                bgcolor: chosen ? brand.primarySoft : "#eef2f7",
                borderColor: chosen ? brand.primaryDark : "transparent",
              },
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: 13,
                // Emoji ignore `color`, so a little scale is the only way the
                // glyph itself can register as picked.
                transform: chosen ? "scale(1.1)" : "none",
                transition: "transform 120ms ease",
              }}
              aria-hidden
            >
              {emoji}
            </Box>
            {count > 0 && <span>{count}</span>}
          </Box>
        );
      })}
    </Stack>
  );
};

/**
 * One message — used for both a top-level wish and a reply.
 *
 * Laid out as a header row followed by full-width content, rather than an
 * avatar column with everything indented beside it. The message and the action
 * row start at the card's left edge, which is what gives a long wish the whole
 * width to run in instead of a column narrowed by the avatar.
 *
 * The header itself is two lines: name and relation on the first, the
 * timestamp alone on the second. Hanging the time off the end of the name row
 * meant it wrapped to its own line anyway as soon as a relation chip appeared,
 * but unpredictably and without alignment.
 */
const WishBody: React.FC<{
  wish: CelebrationWish;
  isFamily: boolean;
  compact?: boolean;
  onDelete: (wishId: string) => void;
  onEdit: (wishId: string, message: string) => Promise<void>;
}> = ({ wish, isFamily, compact, onDelete, onEdit }) => {
  // Edit state is local to the message being edited: two open editors at once
  // is not a thing anyone wants, but neither is lifting this into the stream
  // and threading it back down through replies.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(wish.message);
  const [saving, setSaving] = useState(false);

  const mayEdit = useStillWithinWindow(wish.permissionExpiresAt, wish.canEdit);
  const mayDelete = useStillWithinWindow(wish.permissionExpiresAt, wish.canDelete);

  // An editor left open past the deadline would submit into a refusal.
  useEffect(() => {
    if (!mayEdit) setEditing(false);
  }, [mayEdit]);

  const save = async () => {
    const text = draft.trim();
    if (!text || text === wish.message) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onEdit(wish.id, text);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const author = wish.authorName || "Someone";
  const tint = avatarTint(author);
  const showResolved = Boolean(wish.resolvedRelation);
  const showTyped =
    Boolean(wish.authorRelation) && !sameRelation(wish.authorRelation, wish.resolvedRelation);

  const nameSx = {
    fontWeight: 700,
    fontSize: compact ? 13.5 : 15,
    color: brand.ink,
    lineHeight: 1.3,
  };

  return (
    <Box>
      {/* Header: avatar, then name + relation over the timestamp. */}
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Avatar
          src={wish.authorPhotoUrl || undefined}
          alt={author}
          sx={{
            width: compact ? 32 : 40,
            height: compact ? 32 : 40,
            flexShrink: 0,
            bgcolor: tint.bg,
            color: tint.fg,
            fontSize: compact ? 12 : 14,
            fontWeight: 700,
          }}
        >
          {initialsOf(author) || "?"}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" alignItems="center" sx={{ gap: 0.75, flexWrap: "wrap" }}>
            {/* Linked only for family: a visitor following an author through to
                a profile page is exactly the hop this page exists to prevent. */}
            {isFamily && wish.authorPeopleId ? (
              <Box
                component={Link}
                to={`/profile/person/${wish.authorPeopleId}`}
                sx={{
                  ...nameSx,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {author}
              </Box>
            ) : (
              <Typography sx={nameSx}>{author}</Typography>
            )}

            {showResolved && (
              <Tooltip title="Worked out from the family tree">
                <Chip
                  size="small"
                  label={
                    wish.resolvedRelationHindi
                      ? `${wish.resolvedRelation} · ${wish.resolvedRelationHindi}`
                      : wish.resolvedRelation
                  }
                  sx={{
                    height: 20,
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    bgcolor: brand.accentSoft,
                    color: brand.accentDark,
                  }}
                />
              </Tooltip>
            )}

            {showTyped && (
              <Typography sx={{ fontSize: 11.5, color: brand.slateMuted }}>
                {wish.authorRelation}
              </Typography>
            )}
          </Stack>

          {/* Second line: when, and whether it was changed. */}
          <Typography sx={{ mt: 0.125, fontSize: 11.5, color: brand.slateMuted }}>
            {timeAgo(wish.createdAt)}
            {wish.editedAt && (
              <Box component="span" sx={{ fontStyle: "italic" }}> · edited</Box>
            )}
          </Typography>
        </Box>

        {/* Author controls sit opposite the name, clear of the text below. */}
        <Stack direction="row" sx={{ flexShrink: 0 }}>
          {mayEdit && !editing && (
            <IconButton
              size="small"
              aria-label="Edit this message"
              onClick={() => {
                setDraft(wish.message);
                setEditing(true);
              }}
              sx={{ color: brand.slateMuted }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          )}

          {mayDelete && (
            <Tooltip
              title={
                wish.replies?.length
                  ? `Deletes this and its ${wish.replies.length} ${
                      wish.replies.length === 1 ? "reply" : "replies"
                    }`
                  : "Delete this message"
              }
            >
              <IconButton
                size="small"
                aria-label="Delete this message"
                onClick={() => onDelete(wish.id)}
                sx={{ color: brand.slateMuted }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Message: full width under the header, not a column beside the avatar. */}
      {editing ? (
        <Box sx={{ mt: 1.25 }}>
          <TextField
            value={draft}
            onChange={(changeEvent) => setDraft(changeEvent.target.value.slice(0, 1000))}
            multiline
            minRows={2}
            fullWidth
            autoFocus
            size="small"
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: brand.canvas } }}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: "flex-end" }}>
            <Button
              size="small"
              onClick={() => {
                setDraft(wish.message);
                setEditing(false);
              }}
              sx={{ textTransform: "none", color: brand.slateMuted }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={!draft.trim() || saving}
              onClick={() => void save()}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, boxShadow: "none" }}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </Stack>
        </Box>
      ) : (
        <Typography
          sx={{
            mt: 1.25,
            fontSize: compact ? 13.5 : 14.5,
            lineHeight: 1.6,
            color: brand.ink,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {wish.message}
        </Typography>
      )}
    </Box>
  );
};

export const WishStream: React.FC<WishStreamProps> = ({
  wishes,
  eventType,
  isFamily,
  canInteract,
  onDelete,
  onEdit,
  onReact,
  onReply,
  onRequestSignIn,
}) => {
  const tone = toneFor(eventType);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const submitReply = async (parentWishId: string) => {
    const text = replyText.trim();
    if (!text) return;
    setSending(true);
    try {
      await onReply(parentWishId, text);
      setReplyingTo(null);
      setReplyText("");
    } finally {
      setSending(false);
    }
  };

  if (wishes.length === 0) {
    return (
      <Box component="section" sx={{ ...(cardSx as object), p: { xs: 3, sm: 4 }, textAlign: "center" }}>
        <Typography sx={{ fontSize: 30 }} aria-hidden>
          {tone.emoji}
        </Typography>
        <Typography sx={{ mt: 1, fontWeight: 700, fontSize: 16, color: brand.ink }}>
          No {tone.contributionNoun} yet
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 14, color: brand.slateMuted }}>
          Be the first to write something.
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="section">
      <Typography
        component="h2"
        sx={{ mb: 1.5, fontWeight: 800, fontSize: { xs: 19, sm: 22 }, color: brand.ink }}
      >
        {wishes.length}{" "}
        {wishes.length === 1
          ? tone.contributionNoun.replace(/e?s$/, "")
          : tone.contributionNoun}
      </Typography>

      <Stack spacing={1.5}>
        {wishes.map((wish) => {
          const replies = wish.replies || [];
          const isReplying = replyingTo === wish.id;

          return (
            <Box key={wish.id} sx={{ ...(cardSx as object), p: { xs: 2, sm: 2.5 } }}>
              <WishBody wish={wish} isFamily={isFamily} onDelete={onDelete} onEdit={onEdit} />

              {/* Reactions left, Reply right, both at the card's edge — the
                  indent that used to align these with the text column left a
                  ragged gutter once the message itself went full width. */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mt: 1.5, gap: 1, flexWrap: "wrap" }}
              >
                <ReactionBar
                  wish={wish}
                  canInteract={canInteract}
                  onReact={(kind) => onReact(wish.id, kind)}
                  onRequestSignIn={onRequestSignIn}
                />
                <Button
                  size="small"
                  startIcon={<ReplyIcon sx={{ fontSize: 15 }} />}
                  onClick={() =>
                    canInteract
                      ? setReplyingTo(isReplying ? null : wish.id)
                      : onRequestSignIn(() => setReplyingTo(wish.id))
                  }
                  sx={{
                    minHeight: 26,
                    px: 1,
                    borderRadius: 999,
                    textTransform: "none",
                    fontSize: 12,
                    fontWeight: 700,
                    color: isReplying ? brand.primaryDark : brand.slateMuted,
                  }}
                >
                  Reply
                  {replies.length > 0 ? ` (${replies.length})` : ""}
                </Button>
              </Stack>

              {replies.length > 0 && (
                <Stack
                  spacing={1.5}
                  sx={{
                    mt: 1.5,
                    pl: { xs: 1.5, sm: 2 },
                    // A rule rather than a box: replies are part of the message
                    // above them, not cards of their own.
                    borderLeft: "2px solid",
                    borderColor: brand.border,
                  }}
                >
                  {replies.map((reply) => (
                    <WishBody
                      key={reply.id}
                      wish={reply}
                      isFamily={isFamily}
                      compact
                      onDelete={onDelete}
                      onEdit={onEdit}
                    />
                  ))}
                </Stack>
              )}

              {isReplying && (
                <Box sx={{ mt: 1.5 }}>
                  <TextField
                    value={replyText}
                    onChange={(changeEvent) => setReplyText(changeEvent.target.value.slice(0, 1000))}
                    placeholder={`Reply to ${wish.authorName || "this message"}...`}
                    multiline
                    minRows={2}
                    fullWidth
                    autoFocus
                    size="small"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: brand.canvas } }}
                  />
                  <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: "flex-end" }}>
                    <Button
                      size="small"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                      sx={{ textTransform: "none", color: brand.slateMuted }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!replyText.trim() || sending}
                      onClick={() => void submitReply(wish.id)}
                      sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, boxShadow: "none" }}
                    >
                      {sending ? "Posting…" : "Reply"}
                    </Button>
                  </Stack>
                </Box>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default WishStream;
