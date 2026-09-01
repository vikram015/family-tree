import React from "react";
import { Box, LinearProgress, Skeleton, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import { AnimatedCounter } from "../common/AnimatedCounter";
import { brand } from "../../theme/brand";
import { eyebrowSx, panelSx } from "./homeTheme";
import type { DashboardInsights } from "../../services/apiService";

/**
 * The user's OWN numbers.
 *
 * The page used to lead with platform-wide totals, which tell a returning user
 * nothing about their family. These are all about their tree; the global figures
 * are demoted to `NetworkStrip` further down.
 *
 * Outstanding work is expressed as a completion bar rather than a count of what
 * is missing — see the note on `complete` below.
 */

export interface PersonalStatsProps {
  stats: DashboardInsights["stats"];
  treeName?: string | null;
  treeId?: string | null;
  loading?: boolean;
}

export const PersonalStats: React.FC<PersonalStatsProps> = ({
  stats,
  treeName,
  treeId,
  loading = false,
}) => {
  const treeHref = treeId ? `/families?tree=${treeId}` : "/families";

  // Completion, not deficit.
  //
  // "574 need details" out of 605 people is a true number that reads as "you are
  // 574 tasks behind", and it was the loudest thing on the page. The same data
  // stated as progress gives the user something that moves upward as they work,
  // and the worklist below carries the actual ask.
  const complete = Math.max(0, stats.peopleInTree - stats.incompleteProfiles);
  const percentComplete =
    stats.peopleInTree > 0 ? Math.round((complete / stats.peopleInTree) * 100) : 0;

  const items = [
    {
      label: "In your tree",
      value: stats.peopleInTree,
      icon: <PeopleOutlinedIcon fontSize="small" />,
      to: treeHref,
    },
    {
      label: stats.generations === 1 ? "Generation" : "Generations",
      value: stats.generations,
      icon: <AccountTreeOutlinedIcon fontSize="small" />,
      to: treeHref,
    },
    // A zero here is not news, and styling it like a real figure makes the row
    // look emptier than the tree is. Shown only once there is something to show.
    ...(stats.addedThisMonth > 0
      ? [
          {
            label: "Added this month",
            value: stats.addedThisMonth,
            icon: <PersonAddAltOutlinedIcon fontSize="small" />,
            to: treeHref,
          },
        ]
      : []),
  ];

  return (
    <Box>
      <Typography sx={{ ...eyebrowSx, mb: 1.25 }}>
        {treeName ? `Your tree · ${treeName}` : "Your family tree"}
      </Typography>

      <Box
        sx={{
          display: "grid",
          // 2x2 on phones, one row from sm up — never a tall stack.
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: `repeat(${items.length}, minmax(0, 1fr))`,
          },
          gap: { xs: 1.25, sm: 2 },
        }}
      >
        {items.map((item) => (
          <Box
            key={item.label}
            component={Link}
            to={item.to}
            sx={{
              ...(panelSx as object),
              p: { xs: 1.75, sm: 2.25 },
              minHeight: 96,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Box
              sx={{
                color: brand.primary,
                display: "flex",
                mb: 0.75,
              }}
            >
              {item.icon}
            </Box>
            <Typography
              sx={{
                fontSize: { xs: 24, sm: 28 },
                fontWeight: 800,
                lineHeight: 1.1,
                color: brand.ink,
              }}
            >
              {loading ? (
                <Skeleton width={44} sx={{ display: "inline-block" }} />
              ) : (
                <AnimatedCounter value={item.value} loading={false} />
              )}
            </Typography>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                color: brand.slateMuted,
                mt: 0.25,
              }}
            >
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {!loading && stats.peopleInTree > 0 && (
        <Box
          component={Link}
          to={treeHref}
          sx={{
            ...(panelSx as object),
            display: "block",
            mt: { xs: 1.25, sm: 2 },
            p: { xs: 1.75, sm: 2 },
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 1,
              mb: 1,
            }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.ink }}>
              {complete} of {stats.peopleInTree} profiles complete
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.primary }}>
              {percentComplete}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={percentComplete}
            sx={{
              height: 6,
              borderRadius: 999,
              bgcolor: brand.border,
              "& .MuiLinearProgress-bar": {
                borderRadius: 999,
                bgcolor: brand.primary,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default PersonalStats;
