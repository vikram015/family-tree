import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  ButtonBase,
  Card,
  CardActionArea,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import EventCard from "../Events/EventCard";
import type { FamilyEvents, UpcomingFamilyEvent } from "../../services/apiService";
import { brand } from "../../theme/brand";
import {
  avatarTint,
  initialsOf,
  memorialSurface,
  panelSx,
  scrollStripSx,
  tileSx,
  tone,
} from "./homeTheme";

export interface TodayStripProps {
  events: FamilyEvents | null;
  upcoming: UpcomingFamilyEvent[];
  loading: boolean;
  /** Lets the event cards link into the right tree. */
  treeId?: string | null;
}

/** Most days are quiet, so only the first 6 upcoming items are worth a card —
 *  beyond that the strip becomes a list nobody swipes to the end of. */
const MAX_UPCOMING = 6;

const CURRENT_YEAR = new Date().getFullYear();

type EventFilter = "all" | "birthday" | "anniversary" | "remembrance";

/** A normalized event, so the filter and the strip deal with one shape. */
interface TodayItem {
  key: string;
  type: "birthday" | "anniversary" | "remembrance";
  personId: string;
  name: string;
  photoUrl?: string | null;
  subtitle: string;
  tag: string;
  dateLabel?: string;
}

/** "56th", "1st", "23rd" — the design leads each card with the occurrence. */
function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function yearOf(value?: string | null): string {
  if (!value) return "";
  const year = new Date(value).getFullYear();
  return Number.isFinite(year) ? String(year) : "";
}

function formatDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

/**
 * Section shell.
 *
 * The day's events get the gold ground from the design — the one warm surface
 * on the page, and the reason a remembrance doesn't get announced in the same
 * bright blue as everything else. Quiet days fall back to a plain panel.
 */
const SectionShell: React.FC<{ gold?: boolean; children: React.ReactNode }> = ({
  gold,
  children,
}) => (
  <Box
    component="section"
    sx={{
      ...(panelSx as object),
      ...(gold ? { background: memorialSurface, borderColor: tone.attention.border } : {}),
      p: { xs: 2, md: 2.5 },
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

/** One filter chip. Rendered as a button so keyboard users can tab the set. */
const FilterChip: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <ButtonBase
    onClick={onClick}
    aria-pressed={active}
    sx={{
      px: 1.25,
      py: 0.5,
      borderRadius: 1.5,
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: "nowrap",
      border: "1px solid",
      transition: "background-color 140ms ease, border-color 140ms ease",
      ...(active
        ? { bgcolor: brand.surface, borderColor: tone.attention.borderStrong, color: tone.attention.ink }
        : { bgcolor: "transparent", borderColor: "transparent", color: tone.attention.text }),
    }}
  >
    {label}
  </ButtonBase>
);

export const TodayStrip: React.FC<TodayStripProps> = ({
  events,
  upcoming,
  loading,
  treeId,
}) => {
  const [filter, setFilter] = useState<EventFilter>("all");
  const stripRef = useRef<HTMLDivElement | null>(null);

  const birthdays = events?.birthdays ?? [];
  const anniversaries = events?.anniversaries ?? [];
  const deceased = events?.deceased ?? [];
  const hasToday = birthdays.length + anniversaries.length + deceased.length > 0;
  const upcomingItems = (upcoming ?? []).slice(0, MAX_UPCOMING);

  const items: TodayItem[] = useMemo(() => {
    const list: TodayItem[] = [];
    const birthdays = events?.birthdays ?? [];
    const anniversaries = events?.anniversaries ?? [];
    const deceased = events?.deceased ?? [];

    birthdays.forEach((person) => {
      list.push({
        key: `bday-${person.id}`,
        type: "birthday",
        personId: person.id,
        name: person.name,
        photoUrl: person.photoUrl,
        subtitle: person.age > 0 ? `Turns ${person.age} today 🎂` : "Has a birthday today 🎂",
        tag: person.age > 0 ? `${ordinal(person.age)} birthday` : "Birthday today",
        dateLabel: yearOf(person.dob) ? `Born ${yearOf(person.dob)}` : undefined,
      });
    });

    anniversaries.forEach((a) => {
      list.push({
        key: `anniv-${a.person1Id}-${a.person2Id}`,
        type: "anniversary",
        personId: a.person1Id,
        name: `${a.person1Name} & ${a.person2Name}`,
        photoUrl: a.person1PhotoUrl,
        subtitle: `${a.years} years together 💍`,
        tag: a.years > 0 ? `${ordinal(a.years)} anniversary` : "Anniversary",
        dateLabel: formatDate(a.startDate) || undefined,
      });
    });

    deceased.forEach((person) => {
      const born = yearOf(person.dob);
      const died = yearOf(person.deceasedDate);
      list.push({
        key: `dec-${person.id}`,
        type: "remembrance",
        personId: person.id,
        name: person.name,
        photoUrl: person.photoUrl,
        subtitle: `Remembered — ${person.yearsAgo} years ago 🕊️`,
        tag: person.yearsAgo > 0 ? `${ordinal(person.yearsAgo)} remembrance` : "Remembrance",
        dateLabel: born && died ? `${born}–${died}` : died || undefined,
      });
    });

    return list;
    // `events` is the stable input; the three arrays above are derived from it
    // and would be new objects on every render.
  }, [events]);

  const visible = filter === "all" ? items : items.filter((item) => item.type === filter);

  // Paging scrolls the strip by one card width. Real DOM scrolling rather than
  // an index into a slice, so a swipe and the arrows stay in agreement.
  const page = (direction: 1 | -1) => {
    const node = stripRef.current;
    if (!node) return;
    const card = node.firstElementChild as HTMLElement | null;
    const step = card ? card.getBoundingClientRect().width + 16 : node.clientWidth * 0.8;
    node.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  if (!hasToday && upcomingItems.length === 0 && loading) {
    return (
      <SectionShell>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Skeleton variant="text" width={140} height={16} />
          <Skeleton variant="text" width={220} height={30} />
        </Stack>
        <Box sx={scrollStripSx}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={188} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
      </SectionShell>
    );
  }

  if (hasToday) {
    const filters: { id: EventFilter; label: string }[] = [
      { id: "all", label: `All today (${items.length})` },
      ...(birthdays.length
        ? [{ id: "birthday" as const, label: `${birthdays.length} birthday${birthdays.length > 1 ? "s" : ""}` }]
        : []),
      ...(anniversaries.length
        ? [
            {
              id: "anniversary" as const,
              label: `${anniversaries.length} ${anniversaries.length > 1 ? "anniversaries" : "anniversary"}`,
            },
          ]
        : []),
      ...(deceased.length
        ? [
            {
              id: "remembrance" as const,
              label: `${deceased.length} remembrance${deceased.length > 1 ? "s" : ""}`,
            },
          ]
        : []),
    ];

    return (
      <SectionShell gold>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 2 }}
        >
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mr: 0.5 }}>
              <Typography
                component="h2"
                sx={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: tone.attention.ink,
                }}
              >
                Today in your family
              </Typography>
              <Box
                aria-hidden
                sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#f59e0b" }}
              />
            </Stack>

            {/* Only the kinds that actually occur today get a chip. */}
            {filters.length > 2 &&
              filters.map((item) => (
                <FilterChip
                  key={item.id}
                  label={item.label}
                  active={filter === item.id}
                  onClick={() => setFilter(item.id)}
                />
              ))}
          </Stack>

          {visible.length > 1 && (
            // Arrows are a desktop affordance; on a touch screen the strip is
            // swiped, and a third header row for two buttons is wasted height.
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ display: { xs: "none", sm: "flex" }, flexShrink: 0 }}
            >
              <IconButton
                size="small"
                aria-label="Previous events"
                onClick={() => page(-1)}
                sx={{ border: "1px solid", borderColor: tone.attention.border, bgcolor: brand.surface }}
              >
                <ChevronLeftIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                size="small"
                aria-label="More events"
                onClick={() => page(1)}
                sx={{ border: "1px solid", borderColor: tone.attention.border, bgcolor: brand.surface }}
              >
                <ChevronRightIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>
          )}
        </Stack>

        <Box
          ref={stripRef}
          sx={{
            ...(scrollStripSx as object),
            // Feature cards are taller than the compact ones. Three fit across
            // the main column even when the rail is taking a third of the page,
            // which is what the design shows — so the count is fixed rather
            // than auto-filled off a min width that only holds two.
            gridAutoColumns: { xs: "minmax(268px, 86%)", sm: "minmax(300px, 48%)" },
            gridTemplateColumns: { md: "repeat(3, minmax(0, 1fr))" },
          }}
        >
          {visible.map((item) => (
            <EventCard
              key={item.key}
              variant="feature"
              eventType={item.type}
              personId={item.personId}
              name={item.name}
              photoUrl={item.photoUrl}
              subtitle={item.subtitle}
              tag={item.tag}
              dateLabel={item.dateLabel}
              treeId={treeId}
              year={CURRENT_YEAR}
            />
          ))}
        </Box>
      </SectionShell>
    );
  }

  if (upcomingItems.length > 0) {
    return (
      <SectionShell>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: brand.primary,
            }}
          >
            Coming up
          </Typography>
          <Typography component="h2" sx={{ fontWeight: 800, fontSize: 19, color: brand.ink }}>
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

  // Nothing to celebrate this week is not news, and a full card announcing it
  // pushed the worklist — the page's actual job — below the fold. One quiet line.
  return (
    <Typography variant="body2" sx={{ color: brand.slateMuted }}>
      No birthdays or anniversaries this week.
    </Typography>
  );
};

export default TodayStrip;
