import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import {
  CelebrationEvent,
  CelebrationEventType,
  RelationshipResult,
} from "../../services/apiService";
import { brand } from "../../theme/brand";
import { cardSx, toneFor } from "./celebrationTheme";

/**
 * The box people write in.
 *
 * Two shapes, decided by whether the tree can place the viewer — not by
 * whether they are family:
 *
 *  - **Relation resolved**: the page states it ("You are Sunita Devi's
 *    grandson") and they only write a message. Nothing to ask.
 *  - **Not resolved**: a message plus an optional self-described relationship.
 *    This is the common case, and not only for strangers — measured against
 *    real data, about half of family authors have no recorded path to the
 *    honoree, because trees are incomplete and in-law branches often are not
 *    linked at all. Asking beats showing them nothing.
 *
 * Signing in is required either way. That is not a paywall on kindness; it is
 * what keeps an open, unauthenticated write endpoint off a page whose whole
 * purpose is to be forwarded to strangers.
 */

const MAX_MESSAGE = 1000;

/**
 * What a visitor can call themselves.
 *
 * Offered as a list rather than a free-text box so the labels beside names stay
 * a small, readable set — and so nobody types a paragraph into what renders as
 * a chip. "Other" falls back to free text.
 */
const VISITOR_RELATIONS = [
  "Family friend",
  "Neighbour",
  "Colleague",
  "Classmate",
  "Well-wisher",
];

/**
 * Offered to a family member the tree could not place.
 *
 * Half of real wish authors have no recorded path to the honoree within six
 * hops — trees are incomplete, and a branch joined by marriage often has no
 * link recorded at all. Those people are not strangers, so they get kinship
 * words rather than "Well-wisher".
 */
const FAMILY_RELATIONS = [
  "Son", "Daughter", "Father", "Mother",
  "Brother", "Sister", "Grandson", "Granddaughter",
  "Grandfather", "Grandmother", "Uncle", "Aunt",
  "Nephew", "Niece", "Cousin", "Son-in-law",
  "Daughter-in-law", "Relative",
];

export interface WishComposerProps {
  event: CelebrationEvent;
  isFamily: boolean;
  canPost: boolean;
  /** How the tree says the viewer connects, when it knows. */
  viewerRelation?: RelationshipResult;
  onSubmit: (message: string, authorRelation: string | null) => Promise<void>;
  /** Opens the login modal. Takes an optional action to run once signed in. */
  onRequestSignIn: (onSuccess?: () => void) => void;
}

export const WishComposer: React.FC<WishComposerProps> = ({
  event,
  isFamily,
  canPost,
  viewerRelation,
  onSubmit,
  onRequestSignIn,
}) => {
  const tone = toneFor(event.eventType as CelebrationEventType);
  const [message, setMessage] = useState("");
  const [relation, setRelation] = useState("");
  const [customRelation, setCustomRelation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const honoreeName = event.primaryName || "them";

  /**
   * Whether the tree already knows how this viewer connects.
   *
   * Being family is not enough. A viewer can have full read access to the tree
   * and still have no recorded path to the honoree — an in-law branch, an
   * unlinked node, a gap someone never filled in. Previously only non-family
   * were asked, so those people got no label at all and the feature looked
   * broken on roughly half of real wishes.
   */
  const knowsRelation = Boolean(
    viewerRelation?.found && viewerRelation.label !== "Self",
  );

  const resolvedRelation = useMemo(() => {
    if (knowsRelation) return viewerRelation!.label;
    if (relation === "Other") return customRelation.trim() || null;
    return relation || null;
  }, [knowsRelation, viewerRelation, relation, customRelation]);

  const relationOptions = isFamily ? FAMILY_RELATIONS : VISITOR_RELATIONS;

  const handleSubmit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();
    const text = message.trim();
    if (!text) return;

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(text, resolvedRelation);
      setMessage("");
      setRelation("");
      setCustomRelation("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not post your message. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!canPost) {
    return (
      <Box component="section" sx={{ ...(cardSx as object), p: { xs: 2.5, sm: 3 } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <LockOutlinedIcon sx={{ color: brand.slateMuted, fontSize: 20, mt: 0.25 }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 16, color: brand.ink }}>
              {tone.composerTitle}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 14, color: brand.slate }}>
              Sign in to add your {event.eventType === "remembrance" ? "memory" : "wish"} for{" "}
              {honoreeName}. It takes a phone number and a minute.
            </Typography>
            <Button
              variant="contained"
              // Wrapped, not passed directly: React would hand the click event
              // to the first parameter, which is the after-login callback, and
              // the modal would then try to invoke a MouseEvent on success.
              onClick={() => onRequestSignIn()}
              sx={{ mt: 2, borderRadius: 2, textTransform: "none", fontWeight: 700, boxShadow: "none" }}
            >
              Sign in to write
            </Button>
          </Box>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      component="section"
      id="wish-composer"
      sx={{ ...(cardSx as object), p: { xs: 2.5, sm: 3 } }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 17, color: brand.ink }}>
        {tone.composerTitle}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 13.5, color: brand.slateMuted }}>
        {tone.composerHint}
      </Typography>

      {/* The relationship finder, surfaced. For a family member this is the
          whole point of having a tree: it can say how you're connected without
          being told. */}
      {knowsRelation && (
        <Box
          sx={{
            mt: 2,
            px: 1.75,
            py: 1.25,
            borderRadius: 2,
            bgcolor: brand.primarySoft,
            border: "1px solid rgba(191, 219, 254, 0.8)",
          }}
        >
          <Typography sx={{ fontSize: 13.5, color: brand.ink }}>
            You are {honoreeName}'s{" "}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {viewerRelation.label.toLowerCase()}
            </Box>
            {viewerRelation.labelHindi && (
              <Box component="span" sx={{ color: brand.slate }}> ({viewerRelation.labelHindi})</Box>
            )}
            . This will show beside your name.
          </Typography>
        </Box>
      )}

      <form onSubmit={handleSubmit}>
        {/* Ready-made lines. They append rather than replace, so tapping two
            builds a sentence instead of silently discarding the first. */}
        <Stack direction="row" sx={{ mt: 2, flexWrap: "wrap", gap: 0.75 }}>
          {tone.prompts.map((prompt) => (
            <Chip
              key={prompt}
              label={prompt}
              size="small"
              onClick={() =>
                setMessage((current) => (current.trim() ? `${current.trim()} ${prompt}` : prompt))
              }
              sx={{
                borderRadius: 999,
                fontSize: 12.5,
                bgcolor: brand.canvas,
                border: "1px solid",
                borderColor: brand.border,
                "&:hover": { bgcolor: brand.primarySoft },
              }}
            />
          ))}
        </Stack>

        <TextField
          value={message}
          onChange={(changeEvent) => setMessage(changeEvent.target.value.slice(0, MAX_MESSAGE))}
          placeholder={
            event.eventType === "remembrance"
              ? `Share a memory of ${honoreeName}...`
              : `Write your message for ${honoreeName}...`
          }
          multiline
          minRows={3}
          fullWidth
          sx={{ mt: 2, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: brand.canvas } }}
        />

        {/* Asked of anyone the tree could not place — visitor or family. */}
        {!knowsRelation && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 1.5 }}>
            <TextField
              select
              label={
                isFamily ? "How are you related? (optional)" : "How do you know them? (optional)"
              }
              value={relation}
              onChange={(changeEvent) => setRelation(changeEvent.target.value)}
              size="small"
              sx={{ minWidth: { sm: 260 }, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            >
              {relationOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
              <MenuItem value="Other">Other…</MenuItem>
            </TextField>
            {relation === "Other" && (
              <TextField
                label="Your connection"
                value={customRelation}
                onChange={(changeEvent) => setCustomRelation(changeEvent.target.value.slice(0, 80))}
                size="small"
                sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            )}
          </Stack>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mt: 2, gap: 1, flexWrap: "wrap" }}
        >
          <Typography sx={{ fontSize: 12, color: brand.slateMuted }}>
            Visible to everyone who opens this page.
          </Typography>
          <Button
            type="submit"
            variant="contained"
            disabled={!message.trim() || submitting}
            startIcon={submitting ? <CircularProgress size={15} color="inherit" /> : undefined}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, px: 3, boxShadow: "none" }}
          >
            {submitting ? "Posting…" : "Post"}
          </Button>
        </Stack>
      </form>
    </Box>
  );
};

export default WishComposer;
