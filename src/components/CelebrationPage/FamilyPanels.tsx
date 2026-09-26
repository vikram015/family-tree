import React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import {
  CelebrationEvent,
  CelebrationPedigree,
} from "../../services/apiService";
import { brand } from "../../theme/brand";
import { cardSx, ordinal, toneFor } from "./celebrationTheme";

/**
 * The three blocks a visitor never sees.
 *
 * Everything here answers a question about the *family* rather than about this
 * one occasion — who the honoree's parents are, who else has a milestone
 * coming, what happened on this wall in previous years. Individually each is
 * mild; together they turn a forwarded birthday link into a map of the family,
 * which is precisely what the tiering exists to prevent. The server omits the
 * data entirely for a visitor, so these components simply never mount.
 */

const panelTitleSx = {
  fontWeight: 700,
  fontSize: 15,
  color: brand.ink,
} as const;

const eyebrowSx = {
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.09em",
  textTransform: "uppercase" as const,
  color: brand.slateMuted,
};

/** Where the honoree sits between the generation above and the one below. */
export const PedigreeAnchor: React.FC<{
  pedigree: CelebrationPedigree;
  honoreeName: string;
  honoreePersonId: string;
}> = ({ pedigree, honoreeName, honoreePersonId }) => {
  const hasAnything =
    pedigree.parents.length > 0 ||
    pedigree.spouse ||
    pedigree.childCount > 0 ||
    pedigree.grandchildCount > 0;

  // A node with no recorded parents, spouse or children has no lineage to show,
  // and an empty "Lineage" panel is worse than none.
  if (!hasAnything) return null;

  return (
    <Box sx={{ ...(cardSx as object), p: 2.5 }}>
      <Typography sx={eyebrowSx}>Lineage</Typography>
      <Typography sx={{ ...panelTitleSx, mt: 0.5, mb: 1.75 }}>
        Where {honoreeName.split(" ")[0]} sits
      </Typography>

      <Stack spacing={1.25}>
        {pedigree.parents.length > 0 && (
          <Box>
            <Typography sx={{ fontSize: 11.5, color: brand.slateMuted, mb: 0.25 }}>
              Parents
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: brand.ink, fontWeight: 600 }}>
              {pedigree.parents.map((parent) => parent.name || "Unknown").join(" & ")}
            </Typography>
          </Box>
        )}

        {pedigree.spouse && (
          <Box>
            <Typography sx={{ fontSize: 11.5, color: brand.slateMuted, mb: 0.25 }}>
              Married to
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: brand.ink, fontWeight: 600 }}>
              {pedigree.spouse.name || "Unknown"}
              {pedigree.spouse.startDate && (
                <Box component="span" sx={{ fontWeight: 400, color: brand.slateMuted }}>
                  {" "}
                  {/* The server sends YYYY-MM-DD, so the year is the first
                      four characters — no Date parsing, no timezone. */}
                  ({pedigree.spouse.startDate.slice(0, 4)})
                </Box>
              )}
            </Typography>
          </Box>
        )}

        {(pedigree.childCount > 0 || pedigree.grandchildCount > 0) && (
          <Stack direction="row" spacing={1}>
            {pedigree.childCount > 0 && (
              <Box
                sx={{
                  flex: 1,
                  textAlign: "center",
                  py: 1,
                  borderRadius: 2,
                  bgcolor: brand.canvas,
                }}
              >
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: brand.ink }}>
                  {pedigree.childCount}
                </Typography>
                <Typography sx={{ fontSize: 11, color: brand.slateMuted }}>
                  {pedigree.childCount === 1 ? "Child" : "Children"}
                </Typography>
              </Box>
            )}
            {pedigree.grandchildCount > 0 && (
              <Box
                sx={{
                  flex: 1,
                  textAlign: "center",
                  py: 1,
                  borderRadius: 2,
                  bgcolor: brand.canvas,
                }}
              >
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: brand.accentDark }}>
                  {pedigree.grandchildCount}
                </Typography>
                <Typography sx={{ fontSize: 11, color: brand.slateMuted }}>
                  {pedigree.grandchildCount === 1 ? "Grandchild" : "Grandchildren"}
                </Typography>
              </Box>
            )}
          </Stack>
        )}
      </Stack>

      <Box
        component={Link}
        to={`/families?personId=${honoreePersonId}`}
        sx={{
          display: "block",
          mt: 2,
          py: 1,
          borderRadius: 2,
          textAlign: "center",
          bgcolor: brand.primarySoft,
          color: brand.primaryDark,
          fontSize: 13,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Open the full tree
      </Box>
    </Box>
  );
};

/** One row in the milestone / history lists. */
const EventRow: React.FC<{ event: CelebrationEvent; showYear?: boolean }> = ({
  event,
  showYear,
}) => {
  const tone = toneFor(event.eventType);
  const nth = ordinal(event.occurrenceNumber);
  const names = event.secondaryName
    ? `${event.primaryName} & ${event.secondaryName}`
    : event.primaryName || "Family member";

  return (
    <Box
      component={Link}
      to={`/celebration/${event.id}`}
      sx={{
        display: "block",
        p: 1.5,
        borderRadius: 2,
        textDecoration: "none",
        bgcolor: brand.canvas,
        transition: "background-color 140ms ease",
        "&:hover": { bgcolor: brand.primarySoft },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box component="span" sx={{ fontSize: 15 }} aria-hidden>
          {tone.emoji}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: 13.5,
              fontWeight: 700,
              color: brand.ink,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {names}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: brand.slateMuted }}>
            {nth ? `${nth} ${tone.noun.toLowerCase()}` : tone.noun}
            {showYear ? ` · ${event.eventYear}` : ""}
            {/* A bare trailing number read as part of the date. Name the
                thing it counts, and say nothing at all when it is zero. */}
            {event.wishCount > 0
              ? ` · ${event.wishCount} ${
                  event.wishCount === 1
                    ? tone.contributionNoun.replace(/e?s$/, "")
                    : tone.contributionNoun
                }`
              : ""}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

/** Other celebrations in the same trees. */
export const OtherMilestones: React.FC<{ events: CelebrationEvent[] }> = ({ events }) => {
  if (events.length === 0) return null;

  return (
    <Box sx={{ ...(cardSx as object), p: 2.5 }}>
      <Typography sx={eyebrowSx}>In your family</Typography>
      <Typography sx={{ ...panelTitleSx, mt: 0.5, mb: 1.75 }}>Other milestones</Typography>
      <Stack spacing={1}>
        {events.map((event) => (
          <EventRow key={event.id} event={event} showYear />
        ))}
      </Stack>
    </Box>
  );
};

/**
 * Previous years' walls for this same person.
 *
 * Only shows events other than the one being viewed, and only when there is
 * more than one — a "history" of a single entry is just the page you are on.
 */
export const EventHistory: React.FC<{
  events: CelebrationEvent[];
  currentEventId: string;
  honoreeName: string;
}> = ({ events, currentEventId, honoreeName }) => {
  const past = events.filter((event) => event.id !== currentEventId);
  if (past.length === 0) return null;

  return (
    <Box sx={{ ...(cardSx as object), p: 2.5 }}>
      <Typography sx={eyebrowSx}>Previously</Typography>
      <Typography sx={{ ...panelTitleSx, mt: 0.5, mb: 0.5 }}>
        {honoreeName.split(" ")[0]}'s past celebrations
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: brand.slateMuted, mb: 1.75 }}>
        Every wall the family has written on before.
      </Typography>
      <Stack spacing={1}>
        {past.map((event) => (
          <EventRow key={event.id} event={event} showYear />
        ))}
      </Stack>
    </Box>
  );
};

/**
 * What a visitor gets where the family panels would be.
 *
 * Says plainly that there is more and that it belongs to the family, rather
 * than leaving a blank column that reads as a broken page. Names nothing.
 */
export const VisitorNote: React.FC<{ honoreeName: string }> = ({ honoreeName }) => (
  <Box sx={{ ...(cardSx as object), p: 2.5, bgcolor: brand.canvas }}>
    <Typography sx={eyebrowSx}>Private to the family</Typography>
    <Typography sx={{ ...panelTitleSx, mt: 0.5 }}>
      You're seeing the guest view
    </Typography>
    <Typography sx={{ mt: 0.75, fontSize: 13.5, color: brand.slate, lineHeight: 1.6 }}>
      This page shows {honoreeName.split(" ")[0]}'s celebration and the messages sent to
      them. Family details — the wider tree, other relatives' dates and past
      celebrations — stay with the family.
    </Typography>
    <Chip
      label="Your message is still welcome"
      size="small"
      sx={{
        mt: 1.5,
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        bgcolor: brand.surface,
        border: "1px solid",
        borderColor: brand.border,
      }}
    />
  </Box>
);
