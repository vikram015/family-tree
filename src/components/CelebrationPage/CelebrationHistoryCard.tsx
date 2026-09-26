import React, { useEffect, useState } from "react";
import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { ApiService, CelebrationEvent } from "../../services/apiService";
import { brand } from "../../theme/brand";
import { ordinal, toneFor } from "./celebrationTheme";

/**
 * Every celebration this person has had, as a way into them.
 *
 * Sits on the profile because that is where someone goes looking for "what has
 * happened to this person", and because the celebration page itself is
 * otherwise reachable only from a dashboard card or a forwarded link.
 *
 * Renders nothing at all when there is no history. The endpoint returns an
 * empty list for a visitor as well as for a person nobody has celebrated yet,
 * so a signed-out viewer never learns that there *is* something being withheld
 * — the card simply is not there.
 */

export interface CelebrationHistoryCardProps {
  personId: string;
  personName?: string | null;
}

export const CelebrationHistoryCard: React.FC<CelebrationHistoryCardProps> = ({
  personId,
  personName,
}) => {
  const [events, setEvents] = useState<CelebrationEvent[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    ApiService.getCelebrationHistory(personId)
      .then((rows) => {
        if (active) setEvents(rows || []);
      })
      .catch(() => {
        // Non-fatal: this is an extra on a page that works without it.
        if (active) setEvents([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [personId]);

  if (loading) {
    return <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3 }} />;
  }

  if (!events || events.length === 0) return null;

  const firstName = (personName || "").trim().split(/\s+/)[0];

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: brand.border,
        bgcolor: brand.surface,
        p: { xs: 2, sm: 2.5 },
      }}
    >
      <Typography
        sx={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: brand.slateMuted,
        }}
      >
        Celebrations
      </Typography>
      <Typography sx={{ mt: 0.5, fontWeight: 700, fontSize: 16, color: brand.ink }}>
        {firstName ? `${firstName}'s walls` : "Past celebrations"}
      </Typography>
      <Typography sx={{ mt: 0.25, mb: 1.75, fontSize: 13, color: brand.slateMuted }}>
        Every occasion the family has written on.
      </Typography>

      <Stack spacing={1}>
        {events.map((event) => {
          const tone = toneFor(event.eventType);
          const nth = ordinal(event.occurrenceNumber);
          return (
            <Box
              key={event.id}
              component={Link}
              to={`/celebration/${event.id}`}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                p: 1.5,
                borderRadius: 2,
                textDecoration: "none",
                bgcolor: brand.canvas,
                transition: "background-color 140ms ease",
                "&:hover": { bgcolor: brand.primarySoft },
              }}
            >
              <Box component="span" sx={{ fontSize: 16 }} aria-hidden>
                {tone.emoji}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: brand.ink }}>
                  {nth ? `${nth} ${tone.noun.toLowerCase()}` : tone.noun}
                </Typography>
                <Typography sx={{ fontSize: 12, color: brand.slateMuted }}>
                  {event.eventYear}
                  {event.wishCount > 0
                    ? ` · ${event.wishCount} ${
                        event.wishCount === 1
                          ? tone.contributionNoun.replace(/e?s$/, "")
                          : tone.contributionNoun
                      }`
                    : " · nothing written yet"}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.primaryDark }}>
                Open
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default CelebrationHistoryCard;
