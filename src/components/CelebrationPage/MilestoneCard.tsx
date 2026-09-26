import React from "react";
import { Avatar, Box, Button, Stack, Typography } from "@mui/material";
import ShareIcon from "@mui/icons-material/IosShare";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { Link } from "react-router-dom";
import { CelebrationEvent } from "../../services/apiService";
import { brand } from "../../theme/brand";
import { avatarTint, initialsOf } from "../HomePage/homeTheme";
import { eyebrowFor, headlineFor, isEventToday, ordinal, toneFor } from "./celebrationTheme";

/**
 * The card at the top of a celebration: who it is for, what the occasion is,
 * and the two things a visitor can do about it.
 *
 * What is deliberately NOT here: date of birth, age in years for a living
 * person, blood group, village, caste, contact details. A celebration link gets
 * passed around WhatsApp groups and ends up in front of people the family has
 * no relationship with, so the card carries a name, a face and an occasion and
 * nothing that would not already be on a physical invitation.
 *
 * The ordinal ("68th") is the one number shown, and only because it is the
 * occasion itself rather than a date — it is what is printed on the cake.
 */

export interface MilestoneCardProps {
  event: CelebrationEvent;
  /** Family sees a link into the tree; a visitor has nowhere to go. */
  isFamily: boolean;
  onShare: () => void;
  /** Scrolls to the composer. */
  onWriteWish: () => void;
}

export const MilestoneCard: React.FC<MilestoneCardProps> = ({
  event,
  isFamily,
  onShare,
  onWriteWish,
}) => {
  const tone = toneFor(event.eventType);
  const today = isEventToday(event.eventDate);
  const isCouple = Boolean(event.secondaryPersonId && event.secondaryName);

  const primaryName = event.primaryName || "Family member";
  const displayName = isCouple ? `${primaryName} & ${event.secondaryName}` : primaryName;
  const tint = avatarTint(displayName);

  const nth = ordinal(event.occurrenceNumber);

  return (
    <Box
      component="section"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 3,
        border: "1px solid",
        borderColor: brand.border,
        background: tone.surface,
        p: { xs: 2.5, sm: 4 },
      }}
    >
      {/* Occasion marker. Reads as a label on the card rather than a heading,
          which leaves the person's name as the only h1 on the page. */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ flexWrap: "wrap", gap: 1, mb: { xs: 2, sm: 2.5 } }}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.5,
            py: 0.5,
            borderRadius: 999,
            bgcolor: "rgba(255, 255, 255, 0.72)",
            border: "1px solid rgba(255, 255, 255, 0.9)",
            color: tone.accent,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
          }}
        >
          <span aria-hidden>{tone.emoji}</span>
          {eyebrowFor(event.eventType, today, event.eventYear)}
        </Box>
      </Stack>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 2, sm: 3 }}
        alignItems={{ xs: "center", sm: "flex-start" }}
        sx={{ textAlign: { xs: "center", sm: "left" } }}
      >
        {/* A couple gets both faces, slightly overlapped — one avatar for an
            anniversary would quietly pick a winner. */}
        <Stack direction="row" sx={{ flexShrink: 0 }}>
          <Avatar
            src={event.primaryPhotoUrl || undefined}
            alt={primaryName}
            sx={{
              width: { xs: 96, sm: 120 },
              height: { xs: 96, sm: 120 },
              borderRadius: 3,
              border: "3px solid rgba(255,255,255,0.9)",
              boxShadow: "0 6px 20px rgba(15, 23, 42, 0.12)",
              bgcolor: tint.bg,
              color: tint.fg,
              fontSize: { xs: 30, sm: 38 },
              fontWeight: 800,
            }}
            variant="rounded"
          >
            {initialsOf(primaryName) || "?"}
          </Avatar>
          {isCouple && (
            <Avatar
              src={event.secondaryPhotoUrl || undefined}
              alt={event.secondaryName || ""}
              variant="rounded"
              sx={{
                width: { xs: 96, sm: 120 },
                height: { xs: 96, sm: 120 },
                borderRadius: 3,
                ml: -3,
                border: "3px solid rgba(255,255,255,0.9)",
                boxShadow: "0 6px 20px rgba(15, 23, 42, 0.12)",
                bgcolor: avatarTint(event.secondaryName || "x").bg,
                color: avatarTint(event.secondaryName || "x").fg,
                fontSize: { xs: 30, sm: 38 },
                fontWeight: 800,
              }}
            >
              {initialsOf(event.secondaryName || "") || "?"}
            </Avatar>
          )}
        </Stack>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 26, sm: 34 },
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: brand.ink,
            }}
          >
            {displayName}
            {event.primaryNameHindi && !isCouple && (
              <Box
                component="span"
                sx={{ fontSize: { xs: 18, sm: 22 }, fontWeight: 600, color: brand.slate, ml: 1 }}
              >
                ({event.primaryNameHindi})
              </Box>
            )}
          </Typography>

          <Typography
            sx={{
              mt: 0.75,
              fontSize: { xs: 15, sm: 17 },
              fontWeight: 700,
              color: tone.accent,
            }}
          >
            {headlineFor(event.eventType, event.occurrenceNumber, today, event.eventYear)}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              mt: 2,
              flexWrap: "wrap",
              gap: 1,
              justifyContent: { xs: "center", sm: "flex-start" },
            }}
          >
            <Button
              variant="contained"
              onClick={onWriteWish}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
                px: 2.5,
                boxShadow: "none",
              }}
            >
              {tone.composerTitle}
            </Button>
            <Button
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={onShare}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                bgcolor: "rgba(255,255,255,0.7)",
                borderColor: "rgba(15,23,42,0.12)",
                color: brand.ink,
              }}
            >
              Share
            </Button>
            {/* Only family get a way into the tree. For everyone else the tree
                is not theirs to browse, and an inviting button that 403s is
                worse than no button. */}
            {isFamily && (
              <Button
                component={Link}
                to={`/families?personId=${event.primaryPersonId}`}
                variant="text"
                startIcon={<AccountTreeIcon />}
                sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, color: brand.slate }}
              >
                View in tree
              </Button>
            )}
          </Stack>
        </Box>

        {/* The ordinal, as a standalone figure. Only rendered when known, so a
            person with no recorded year never gets a "0th". */}
        {nth && (
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              px: 2.5,
              py: 1.5,
              borderRadius: 3,
              bgcolor: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(255,255,255,0.9)",
            }}
          >
            <Typography
              sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: tone.accent }}
            >
              {nth}
            </Typography>
            <Typography
              sx={{
                mt: 0.5,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: brand.slateMuted,
              }}
            >
              {tone.noun}
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default MilestoneCard;
