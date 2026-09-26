import React, { useEffect, useState } from "react";
import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { ApiService, FamilyPhoto } from "../../services/apiService";
import { brand } from "../../theme/brand";
import { iconWellSx, panelSx, tone } from "./homeTheme";

/**
 * What the family has added to the archive lately.
 *
 * The design puts a "recent vault additions" panel at the top of the rail —
 * land deeds, memoirs, scanned records. The archive we actually have is family
 * photos, so this shows those: the user's own uploads and anything shared with
 * them, newest first.
 *
 * Rendered only on wide screens (the rail doesn't exist below `xl`), so it
 * fetches on mount and stays quiet if the call fails — a side panel must never
 * take the dashboard down with it.
 */

const MAX_ITEMS = 4;

/** "2h ago", "3d ago" — a full date in a 240px rail is noise. */
function relativeTime(value?: string | null): string {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "";

  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(value).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export const RecentPhotos: React.FC = () => {
  const [photos, setPhotos] = useState<FamilyPhoto[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      ApiService.getMyFamilyPhotos().catch(() => [] as FamilyPhoto[]),
      ApiService.getSharedFamilyPhotos().catch(() => [] as FamilyPhoto[]),
    ])
      .then(([mine, shared]) => {
        if (cancelled) return;
        const merged = [...(mine || []), ...(shared || [])]
          .filter((photo, index, all) => all.findIndex((p) => p.id === photo.id) === index)
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
          .slice(0, MAX_ITEMS);
        setPhotos(merged);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // An empty archive gets no panel at all: a rail slot saying "nothing here"
  // is worse than a shorter rail.
  if (!loading && (!photos || photos.length === 0)) return null;

  return (
    <Box sx={{ ...(panelSx as object), p: 2.5 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.75 }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <Box sx={iconWellSx("primary", 28)}>
            <PhotoLibraryOutlinedIcon />
          </Box>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: brand.ink }}>
            Recent photos
          </Typography>
        </Stack>
        <Typography
          component={Link}
          to="/photos"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 700,
            color: brand.primary,
            textDecoration: "none",
          }}
        >
          All
          <ChevronRightIcon sx={{ fontSize: 15 }} />
        </Typography>
      </Stack>

      <Stack spacing={1.25}>
        {loading &&
          [0, 1].map((key) => (
            <Stack key={key} direction="row" spacing={1.25} alignItems="center">
              <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: 2 }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="70%" height={16} />
                <Skeleton variant="text" width="40%" height={14} />
              </Box>
            </Stack>
          ))}

        {(photos || []).map((photo) => (
          <Stack
            key={photo.id}
            component={Link}
            to="/photos"
            direction="row"
            spacing={1.25}
            alignItems="center"
            sx={{
              p: 1,
              borderRadius: 2,
              textDecoration: "none",
              bgcolor: brand.canvas,
              border: "1px solid #f1f5f9",
              transition: "border-color 140ms ease",
              "@media (hover: hover)": { "&:hover": { borderColor: brand.border } },
            }}
          >
            {/* Signed URLs are short-lived, so a thumbnail can 404 on a page
                left open. Falling back to the tinted well keeps the row intact
                instead of showing a broken-image glyph. */}
            <Box
              component="img"
              src={photo.thumbUrl || photo.photoUrl}
              alt=""
              loading="lazy"
              onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
                event.currentTarget.style.visibility = "hidden";
              }}
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: 1.5,
                objectFit: "cover",
                bgcolor: tone.primary.well,
              }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600, color: brand.ink }}>
                {photo.visibility === "family" ? "Shared with family" : "Private upload"}
              </Typography>
              <Typography sx={{ fontSize: 11, color: brand.slateMuted }}>
                {relativeTime(photo.createdAt)}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

export default RecentPhotos;
