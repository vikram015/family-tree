import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";

import EventCard from "../Events/EventCard";
import type { FamilyEvents, UpcomingFamilyEvent } from "../../services/apiService";
import { brand } from "../../theme/brand";
import {
  avatarTint,
  eyebrowSx,
  heroSurface,
  initialsOf,
  panelSx,
  scrollStripSx,
  sectionTitleSx,
  tileSx,
} from "./homeTheme";

export interface TodayStripProps {
  events: FamilyEvents | null;
  upcoming: UpcomingFamilyEvent[];
  loading: boolean;
}

/** Most days are quiet, so only the first 6 upcoming items are worth a card —
 *  beyond that the strip becomes a list nobody swipes to the end of. */
const MAX_UPCOMING = 6;

const CURRENT_YEAR = new Date().getFullYear();

/** "2 birthdays and 1 anniversary today" — the title earns its place by saying
 *  what's actually there instead of repeating the eyebrow. */
function buildTodayTitle(birthdays: number, anniversaries: number, remembrances: number): string {
  const parts: string[] = [];
  if (birthdays > 0) parts.push(`${birthdays} birthday${birthdays > 1 ? "s" : ""}`);
  if (anniversaries > 0) parts.push(`${anniversaries} ${anniversaries > 1 ? "anniversaries" : "anniversary"}`);
  if (remembrances > 0) parts.push(`${remembrances} remembrance${remembrances > 1 ? "s" : ""}`);

  if (parts.length === 0) return "Today in your family";
  if (parts.length === 1) return `${parts[0]} today`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]} today`;
}

function upcomingSubtitle(item: UpcomingFamilyEvent): string {
  if (item.type === "anniversary") {
    return item.years > 0 ? `${item.years} years together` : "Anniversary";
  }
  return item.years > 0 ? `Turns ${item.years}` : "Birthday";
}

function daysAwayLabel(daysAway: number): string {
  if (daysAway <= 1) return "Tomorrow";
  return `In ${daysAway} days`;
}

/** Section shell so the three states share one rhythm; the hero wash is only
 *  used when there is something to celebrate. */
const SectionShell: React.FC<{ hero?: boolean; children: React.ReactNode }> = ({
  hero,
  children,
}) => (
  <Box
    component="section"
    sx={{
      ...(hero
        ? { background: heroSurface, borderRadius: 3, border: "1px solid", borderColor: brand.border }
        : (panelSx as object)),
      // Matches the strip's mobile bleed (mx: -2) so cards line up with the heading.
      p: { xs: 2, md: 3 },
      overflow: "hidden",
    }}
  >
    {children}
  </Box>
);

const UpcomingCard: React.FC<{ item: UpcomingFamilyEvent }> = ({ item }) => {
  const navigate = useNavigate();
  const tint = avatarTint(item.name || item.personId);

  return (
    <Card variant="outlined" sx={{ ...(tileSx as object), height: "100%" }}>
      <CardActionArea
        onClick={() => navigate(`/profile/person/${item.personId}`)}
        sx={{ p: 1.75, borderRadius: 3, minHeight: 88, alignItems: "stretch" }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={item.photoUrl || undefined}
            alt={item.name}
            sx={{ width: 48, height: 48, bgcolor: tint.bg, color: tint.fg, fontWeight: 700 }}
          >
            {initialsOf(item.name)}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="subtitle1"
              noWrap
              title={item.name}
              sx={{ fontWeight: 700, color: brand.ink, lineHeight: 1.25 }}
            >
              {item.name}
            </Typography>
            <Typography variant="body2" noWrap sx={{ color: brand.slateMuted }}>
              {upcomingSubtitle(item)}
            </Typography>
            <Chip
              size="small"
              label={daysAwayLabel(item.daysAway)}
              sx={{
                mt: 0.75,
                height: 22,
                bgcolor: item.type === "anniversary" ? brand.accentSoft : brand.primarySoft,
                color: item.type === "anniversary" ? brand.accentDark : brand.primaryDark,
                fontWeight: 600,
                "& .MuiChip-label": { px: 0.9, fontSize: 12 },
              }}
            />
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
};

export const TodayStrip: React.FC<TodayStripProps> = ({ events, upcoming, loading }) => {
  const birthdays = events?.birthdays ?? [];
  const anniversaries = events?.anniversaries ?? [];
  const deceased = events?.deceased ?? [];
  const hasToday = birthdays.length + anniversaries.length + deceased.length > 0;
  const upcomingItems = (upcoming ?? []).slice(0, MAX_UPCOMING);

  if (!hasToday && upcomingItems.length === 0 && loading) {
    return (
      <SectionShell>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Skeleton variant="text" width={140} height={16} />
          <Skeleton variant="text" width={220} height={30} />
        </Stack>
        <Box sx={scrollStripSx}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={96} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
      </SectionShell>
    );
  }

  if (hasToday) {
    return (
      <SectionShell hero>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography sx={eyebrowSx}>Today in your family</Typography>
          <Typography component="h2" sx={sectionTitleSx}>
            {buildTodayTitle(birthdays.length, anniversaries.length, deceased.length)}
          </Typography>
        </Stack>

        <Box sx={scrollStripSx}>
          {birthdays.map((person) => (
            <EventCard
              key={`bday-${person.id}`}
              eventType="birthday"
              personId={person.id}
              name={person.name}
              photoUrl={person.photoUrl}
              subtitle={person.age > 0 ? `Turns ${person.age} today 🎂` : "Has a birthday today 🎂"}
              year={CURRENT_YEAR}
            />
          ))}

          {anniversaries.map((a) => (
            <EventCard
              key={`anniv-${a.person1Id}-${a.person2Id}`}
              eventType="anniversary"
              personId={a.person1Id}
              name={`${a.person1Name} & ${a.person2Name}`}
              photoUrl={a.person1PhotoUrl}
              subtitle={`${a.years} years together 💍`}
              year={CURRENT_YEAR}
            />
          ))}

          {deceased.map((person) => (
            <EventCard
              key={`dec-${person.id}`}
              eventType="remembrance"
              personId={person.id}
              name={person.name}
              photoUrl={person.photoUrl}
              subtitle={`Remembered — ${person.yearsAgo} years ago 🕊️`}
              year={CURRENT_YEAR}
            />
          ))}
        </Box>
      </SectionShell>
    );
  }

  if (upcomingItems.length > 0) {
    return (
      <SectionShell hero>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography sx={eyebrowSx}>Coming up</Typography>
          <Typography component="h2" sx={sectionTitleSx}>
            The days ahead
          </Typography>
        </Stack>

        <Box sx={scrollStripSx}>
          {upcomingItems.map((item) => (
            <UpcomingCard key={item.id} item={item} />
          ))}
        </Box>
      </SectionShell>
    );
  }

  return (
    <SectionShell>
      <Stack spacing={0.5}>
        <Typography sx={eyebrowSx}>Today in your family</Typography>
        <Typography component="h2" sx={sectionTitleSx}>
          No family dates this week.
        </Typography>
        <Typography variant="body2" sx={{ color: brand.slateMuted }}>
          Birthdays, anniversaries and remembrances will appear here as they come around.
        </Typography>
      </Stack>
    </SectionShell>
  );
};

export default TodayStrip;
