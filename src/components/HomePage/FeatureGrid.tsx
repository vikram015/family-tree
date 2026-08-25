import React from "react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import { brand } from "../../theme/brand";
import { eyebrowSx, sectionTitleSx, tileSx } from "./homeTheme";

export interface FeatureGridProps {
  counts: { photos: number; pendingRequests: number };
  loading?: boolean;
}

/** Badge tone. `attention` is reserved for work waiting on the user (pending
 *  requests) so it never blends in with a plain informational count. */
type BadgeTone = "info" | "attention";

interface FeatureTile {
  label: string;
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
    { label: "Family Tree", to: "/families", icon: <AccountTreeOutlinedIcon /> },
    { label: "Photos", to: "/photos", icon: <PhotoLibraryOutlinedIcon />, badge: photos, tone: "info" },
    { label: "Business", to: "/business", icon: <StorefrontOutlinedIcon /> },
    { label: "My Profile", to: "/profile", icon: <PersonOutlineIcon /> },
    {
      label: "Requests",
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
                gap: 0.75,
                textAlign: "center",
                // Comfortably past the 44px touch minimum on the smallest phone.
                minHeight: { xs: 96, md: 104 },
                px: 1,
                py: 1.5,
                color: brand.ink,
                textDecoration: "none",
              }}
            >
              <Box
                sx={{
                  color: brand.primary,
                  display: "flex",
                  "& .MuiSvgIcon-root": { fontSize: { xs: 24, md: 26 } },
                }}
              >
                {tile.icon}
              </Box>
              <Typography
                sx={{
                  fontSize: { xs: 12.5, md: 13 },
                  fontWeight: 600,
                  lineHeight: 1.25,
                  color: brand.ink,
                }}
              >
                {tile.label}
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
