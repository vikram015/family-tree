import React from "react";
import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { AnimatedCounter } from "../common/AnimatedCounter";
import { brand } from "../../theme/brand";
import {
  eyebrowSx,
  iconWellSx,
  microLabelSx,
  statCardSx,
  statValueSx,
  tone,
  ToneName,
} from "./homeTheme";
import type { DashboardInsights } from "../../services/apiService";

/**
 * The user's OWN numbers.
 *
 * The page used to lead with platform-wide totals, which tell a returning user
 * nothing about their family. These are all about their tree; the global figures
 * are demoted to `NetworkStrip` further down.
 *
 * Four cards, each one thing: how big the tree is, how deep it reaches, what
 * arrived this month, and what still needs filling in. The outstanding-work card
 * is the warm one and is the only card that links sideways rather than into the
 * tree — it scrolls to the worklist that can actually clear it.
 */

export interface PersonalStatsProps {
  stats: DashboardInsights["stats"];
  treeName?: string | null;
  treeId?: string | null;
  loading?: boolean;
}

interface StatCard {
  key: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: ToneName;
  /** Small uppercase label opposite the icon. */
  tag: React.ReactNode;
  /** Muted note on the footer's right — context the figure alone can't give. */
  note?: string;
  /** Renders the tag as a green chip rather than a plain micro-label. */
  positive?: boolean;
  to: string;
  attention?: boolean;
}

export const PersonalStats: React.FC<PersonalStatsProps> = ({
  stats,
  treeName,
  treeId,
  loading = false,
}) => {
  const treeHref = treeId ? `/families?tree=${treeId}` : "/families";

  const complete = Math.max(0, stats.peopleInTree - stats.incompleteProfiles);
  const percentComplete =
    stats.peopleInTree > 0 ? Math.round((complete / stats.peopleInTree) * 100) : 0;

  // Growth against the tree as it stood at the start of the month. Suppressed
  // when every person in the tree was added this month (a brand-new tree, where
  // "+100% growth" would be noise rather than news).
  const priorCount = stats.peopleInTree - stats.addedThisMonth;
  const growthPercent =
    priorCount > 0 && stats.addedThisMonth > 0
      ? Math.round((stats.addedThisMonth / priorCount) * 1000) / 10
      : null;

  const cards: StatCard[] = [
    {
      key: "people",
      label: "In your tree",
      value: stats.peopleInTree,
      icon: <PeopleOutlinedIcon />,
      tone: "primary",
      tag: "Tree size",
      note: "Direct & related",
      to: treeHref,
    },
    {
      key: "generations",
      label: stats.generations === 1 ? "Generation" : "Generations",
      value: stats.generations,
      icon: <AccountTreeOutlinedIcon />,
      tone: "indigo",
      tag: "Depth",
      to: treeHref,
    },
    {
      key: "added",
      label: "Added this month",
      value: stats.addedThisMonth,
      icon: <PersonAddAltOutlinedIcon />,
      tone: "emerald",
      tag: growthPercent ? `+${growthPercent}% growth` : "New",
      positive: !!growthPercent,
      to: treeHref,
    },
    // The deficit, stated plainly. An earlier version showed only completion
    // ("31 of 605 profiles complete") to keep the page from reading as a backlog;
    // the count is what makes the worklist below feel worth opening, so it is
    // back — paired with the percentage so progress is visible in the same card.
    {
      key: "incomplete",
      label: "Need essential details",
      value: stats.incompleteProfiles,
      icon: <ReportProblemOutlinedIcon />,
      tone: "attention",
      // "Needs" is dropped on phones, where the card is half-width and the full
      // label truncated to "NEEDS ATTE…".
      tag: (
        <>
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            Needs{" "}
          </Box>
          Attention
        </>
      ),
      note: stats.peopleInTree > 0 ? `${percentComplete}% complete` : undefined,
      to: "#missing-details",
      attention: true,
    },
  ];

  return (
    <Box component="section">
      {/* Which tree these numbers describe, and the way out to it. */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.25, minHeight: 24 }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <Typography sx={{ ...(eyebrowSx as object), flexShrink: 0 }}>
            Ancestral branch
          </Typography>
          {loading ? (
            <Skeleton variant="rounded" width={120} height={20} />
          ) : (
            treeName && (
              <Typography
                noWrap
                title={treeName}
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: 12,
                  fontWeight: 600,
                  color: brand.slate,
                  bgcolor: brand.canvas,
                  border: "1px solid",
                  borderColor: brand.border,
                }}
              >
                {treeName}
              </Typography>
            )
          )}

          {/* The design's "98.4% provenance verified" badge, backed by the one
              completeness figure the tree actually has. */}
          {!loading && stats.peopleInTree > 0 && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.4}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                flexShrink: 0,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                bgcolor: tone.emerald.well,
                border: "1px solid #a7f3d0",
              }}
            >
              <CheckCircleOutlineIcon sx={{ fontSize: 13, color: tone.emerald.icon }} />
              <Typography
                noWrap
                sx={{ fontSize: 11.5, fontWeight: 700, color: tone.emerald.icon }}
              >
                {percentComplete}% profiles complete
              </Typography>
            </Stack>
          )}
        </Stack>

        {/* Named for what it does. It opens the tree these numbers describe —
            calling it "switch branch" promised a picker the link never shows. */}
        <Typography
          component={Link}
          to={treeHref}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 700,
            color: brand.primary,
            textDecoration: "none",
            "&:hover": { color: brand.primaryDark },
          }}
        >
          Open tree
          <ChevronRightIcon sx={{ fontSize: 16 }} />
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          // 2x2 on phones, one row from md up — never a tall stack.
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: { xs: 1.25, sm: 2 },
        }}
      >
        {cards.map((card) => {
          // A same-page fragment has to be a real anchor: <Link to="#..."> only
          // rewrites the URL, and the router does no scrolling of its own, so
          // the card would look dead. The browser handles the anchor natively.
          const isFragment = card.to.startsWith("#");
          const linkProps = isFragment
            ? { component: "a" as const, href: card.to }
            : { component: Link, to: card.to };

          return (
          <Box key={card.key} {...linkProps} sx={statCardSx(card.attention)}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Box sx={iconWellSx(card.tone)}>{card.icon}</Box>
              <Typography
                noWrap
                sx={
                  card.attention
                    ? {
                        ...(microLabelSx as object),
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 0.75,
                        bgcolor: tone.attention.chip,
                        color: tone.attention.ink,
                      }
                    : card.positive
                      ? {
                          ...(microLabelSx as object),
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 0.75,
                          textTransform: "none",
                          letterSpacing: 0,
                          bgcolor: tone.emerald.well,
                          color: tone.emerald.icon,
                        }
                      : microLabelSx
                }
              >
                {card.tag}
              </Typography>
            </Stack>

            <Box sx={{ mt: 1.25 }}>
              <Typography
                sx={
                  card.attention
                    ? { ...(statValueSx as object), color: tone.attention.ink }
                    : statValueSx
                }
              >
                {loading ? (
                  <Skeleton width={52} sx={{ display: "inline-block" }} />
                ) : (
                  <AnimatedCounter value={card.value} loading={false} />
                )}
              </Typography>

              {/* Side by side where the card is wide enough. At `xs` (two per
                  row) and at `xl` (where the rail narrows the main column) the
                  two halves would both ellipsis, so they stack instead. */}
              <Stack
                direction={{ xs: "column", sm: "row", xl: "column" }}
                alignItems={{ xs: "flex-start", sm: "baseline", xl: "flex-start" }}
                justifyContent="space-between"
                spacing={{ xs: 0, sm: 1, xl: 0 }}
                sx={{ mt: 0.25 }}
              >
                <Typography
                  noWrap
                  sx={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: card.attention ? tone.attention.text : brand.slateMuted,
                  }}
                >
                  {card.label}
                </Typography>
                {card.note && !loading && (
                  <Typography
                    noWrap
                    sx={{
                      maxWidth: "100%",
                      fontSize: 12,
                      fontWeight: 600,
                      color: card.attention ? tone.attention.icon : brand.primary,
                    }}
                  >
                    {card.note}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default PersonalStats;
