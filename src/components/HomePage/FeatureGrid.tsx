import React from "react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import { brand } from "../../theme/brand";
import { eyebrowSx, iconWellSx, sectionTitleSx, tileSx } from "./homeTheme";

export interface FeatureGridProps {
  counts: { photos: number; pendingRequests: number };
  loading?: boolean;
}

/** Badge tone. `attention` is reserved for work waiting on the user (pending
 *  requests) so it never blends in with a plain informational count. */
type BadgeTone = "info" | "attention";

interface FeatureTile {
  label: string;
  /** One-line note under the label — says what the destination holds, so the
   *  grid reads as five places rather than five words. */
  hint: string;
  to: string;
  icon: React.ReactNode;
  badge?: number;
  tone?: BadgeTone;
}

/** Amber pulled from the same tint family as `avatarTint` in homeTheme — the
 *  brand palette has no warning color, and green would read as "done". */
const attentionBadge = { bg: "#fef3c7", fg: "#b45309" };
const infoBadge = { bg: brand.primarySoft, fg: brand.primaryDark };

export const FeatureGrid: React.FC<FeatureGridProps> = ({ counts, loading = false }) => {
  // Counts can arrive as SQL bigint strings, so coerce before comparing to 0.
  const photos = Number(counts?.photos) || 0;
  const pendingRequests = Number(counts?.pendingRequests) || 0;

  const tiles: FeatureTile[] = [
    {
      label: "Family Tree",
      hint: "Lineage graph",
      to: "/families",
      icon: <AccountTreeOutlinedIcon />,
    },
    {
      label: "Photos",
      hint: "Keepsakes & deeds",
      to: "/photos",
      icon: <PhotoLibraryOutlinedIcon />,
      badge: photos,
      tone: "info",
    },
    {
      label: "Business",
      hint: "Trade registries",
      to: "/business",
      icon: <StorefrontOutlinedIcon />,
    },
    {
      label: "My Profile",
      hint: "Profile settings",
      to: "/profile",
      icon: <PersonOutlineIcon />,
    },
    {
      label: "Requests",
      hint: "Kin verifications",
      to: "/requests",
      icon: <PendingActionsOutlinedIcon />,
      badge: pendingRequests,
      tone: "attention",
    },
  ];

  return (
    <Box component="section">
      <Stack spacing={0.25} sx={{ mb: { xs: 1.5, md: 2 } }}>
        <Typography sx={eyebrowSx}>Explore</Typography>
        <Typography component="h2" sx={sectionTitleSx}>
          Everything in one place
        </Typography>
      </Stack>

      <Box
        sx={{
          display: "grid",
          // Explicit column counts rather than auto-fit: five tiles land as
          // 2 / 3 / 5. On xs and sm that leaves one tile alone on the last row,
          // so it spans the remaining columns rather than leaving a hole.
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))",
            md: "repeat(5, minmax(0, 1fr))",
          },
          gap: { xs: 1.25, sm: 1.5, md: 2 },
          "& > *:last-child": {
            gridColumn: { xs: "span 2", sm: "span 2", md: "span 1" },
          },
        }}
      >
        {tiles.map((tile) => {
          // A zero is noise, and during load the number isn't trustworthy yet.
          const showBadge = !loading && !!tile.badge && tile.badge > 0;
          const tone = tile.tone === "attention" ? attentionBadge : infoBadge;

          return (
            <ButtonBase
              key={tile.to}
              component={Link}
              to={tile.to}
              aria-label={
                showBadge ? `${tile.label}, ${tile.badge} ${tile.tone === "attention" ? "pending" : "items"}` : tile.label
              }
              sx={{
                ...(tileSx as object),
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.25,
                textAlign: "center",
                // Comfortably past the 44px touch minimum on the smallest phone.
                minHeight: { xs: 108, md: 124 },
                px: 1,
                py: 2,
                color: brand.ink,
                textDecoration: "none",
                // The icon well fills in on hover so the whole tile responds,
                // not just its border.
                "@media (hover: hover)": {
                  "&:hover .tile-icon-well": {
                    bgcolor: brand.primary,
                    color: brand.surface,
                  },
                },
              }}
            >
              <Box
                className="tile-icon-well"
                sx={{
                  ...(iconWellSx("primary", 44) as object),
                  mb: 1.25,
                  transition: "background-color 140ms ease, color 140ms ease",
                }}
              >
                {tile.icon}
              </Box>
              <Typography
                sx={{
                  fontSize: { xs: 13, md: 13.5 },
                  fontWeight: 700,
                  lineHeight: 1.25,
                  color: brand.ink,
                }}
              >
                {tile.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: 11.5,
                  fontWeight: 500,
                  lineHeight: 1.3,
                  color: brand.slateMuted,
                }}
              >
                {tile.hint}
              </Typography>

              {showBadge && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    minWidth: 20,
                    height: 20,
                    px: 0.75,
                    borderRadius: 10,
                    bgcolor: tone.bg,
                    color: tone.fg,
                    fontSize: 11,
                    fontWeight: 800,
                    lineHeight: "20px",
                  }}
                >
                  {tile.badge > 99 ? "99+" : tile.badge}
                </Box>
              )}
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
};

export default FeatureGrid;
