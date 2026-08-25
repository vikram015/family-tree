import React from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import { AnimatedCounter } from "../common/AnimatedCounter";
import { brand } from "../../theme/brand";
import { eyebrowSx, panelSx } from "./homeTheme";
import type { DashboardInsights } from "../../services/apiService";

/** Attention tint for outstanding work — green would read as "already done",
 *  and the brand palette has no warning color of its own. */
const ATTENTION = { border: "#fcd34d", bg: "#fffbeb", fg: "#b45309" };


/**
 * The user's OWN numbers.
 *
 * The page used to lead with platform-wide totals, which tell a returning user
 * nothing about their family. These four are all about their tree; the global
 * figures are demoted to `NetworkStrip` further down.
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
  const items = [
    {
      label: "In your tree",
      value: stats.peopleInTree,
      icon: <PeopleOutlinedIcon fontSize="small" />,
      to: treeId ? `/families?tree=${treeId}` : "/families",
    },
    {
      label: stats.generations === 1 ? "Generation" : "Generations",
      value: stats.generations,
      icon: <AccountTreeOutlinedIcon fontSize="small" />,
      to: treeId ? `/families?tree=${treeId}` : "/families",
    },
    {
      label: "Added this month",
      value: stats.addedThisMonth,
      icon: <PersonAddAltOutlinedIcon fontSize="small" />,
      to: treeId ? `/families?tree=${treeId}` : "/families",
    },
    {
      label: "Need details",
      value: stats.incompleteProfiles,
      icon: <ErrorOutlineOutlinedIcon fontSize="small" />,
      // Only this one is a call to action, so tint it when there's work to do.
      accent: stats.incompleteProfiles > 0,
      to: treeId ? `/families?tree=${treeId}` : "/families",
    },
  ];

  return (
    <Box>
      <Typography sx={{ ...eyebrowSx, mb: 1.25 }}>
        {treeName ? treeName : "Your family tree"}
      </Typography>

      <Box
        sx={{
          display: "grid",
          // 2x2 on phones, one row from sm up — never a tall stack.
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, 1fr)" },
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
              ...(item.accent && {
                borderColor: ATTENTION.border,
                bgcolor: ATTENTION.bg,
              }),
            }}
          >
            <Box
              sx={{
                color: item.accent ? ATTENTION.fg : brand.primary,
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
                color: item.accent ? ATTENTION.fg : brand.ink,
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
                color: item.accent ? ATTENTION.fg : brand.slateMuted,
                mt: 0.25,
              }}
            >
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default PersonalStats;
