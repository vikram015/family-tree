import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { keyframes } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckIcon from "@mui/icons-material/Check";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CloseIcon from "@mui/icons-material/Close";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import dayjs from "dayjs";
import type { FamilyPhoto, PhotoVisibility } from "../../services/apiService";
import { brand } from "../../theme/brand";

const VISIBILITY_META: Record<PhotoVisibility, { label: string; icon: React.ReactElement }> = {
  private: { label: "Private", icon: <LockOutlinedIcon fontSize="inherit" /> },
  family: { label: "Family", icon: <GroupsOutlinedIcon fontSize="inherit" /> },
};

const SWIPE_THRESHOLD_PX = 50;

const slideFromRight = keyframes`
  from { transform: translateX(32px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;
const slideFromLeft = keyframes`
  from { transform: translateX(-32px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

function dateGroupLabel(iso: string): string {
  const date = dayjs(iso);
  const now = dayjs();
  if (date.isSame(now, "day")) return "Today";
  if (date.isSame(now.subtract(1, "day"), "day")) return "Yesterday";
  if (date.isSame(now, "year")) return date.format("MMMM D");
  return date.format("MMMM YYYY");
}

function groupByDate(photos: FamilyPhoto[]): Array<{ label: string; photos: FamilyPhoto[] }> {
  const groups: Array<{ label: string; photos: FamilyPhoto[] }> = [];
  for (const photo of photos) {
    const label = dateGroupLabel(photo.createdAt);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.photos.push(photo);
    } else {
      groups.push({ label, photos: [photo] });
    }
  }
  return groups;
}

interface PhotoGridProps {
  photos: FamilyPhoto[];
  loading?: boolean;
  emptyMessage: string;
  /** Only the uploader can change visibility/delete — pass the viewer's id to know which cards get the menu. */
  currentUserId?: string | null;
  onChangeVisibility?: (photoId: string, visibility: PhotoVisibility) => Promise<void> | void;
  onDelete?: (photoId: string) => Promise<void> | void;
}

export function PhotoGrid({
  photos,
  loading,
  emptyMessage,
  currentUserId,
  onChangeVisibility,
  onDelete,
}: PhotoGridProps) {
  const theme = useTheme();
  const fullScreenPreview = useMediaQuery(theme.breakpoints.down("sm"));
  const groups = useMemo(() => groupByDate(photos), [photos]);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; photo: FamilyPhoto } | null>(null);
  const [confirmDeletePhoto, setConfirmDeletePhoto] = useState<FamilyPhoto | null>(null);
  const [previewPhotoId, setPreviewPhotoId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [fullImageLoaded, setFullImageLoaded] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // `photos` is already the display order (server-sorted, newest first) — the
  // date groups only partition it, they never reorder — so it doubles as the
  // flat list prev/next navigation walks.
  const previewIndex = previewPhotoId ? photos.findIndex((p) => p.id === previewPhotoId) : -1;
  const previewPhoto = previewIndex >= 0 ? photos[previewIndex] : null;
  const hasPrev = previewIndex > 0;
  const hasNext = previewIndex >= 0 && previewIndex < photos.length - 1;

  // Opening the preview pushes a history entry, so the device/browser back
  // button closes the preview (pops that entry) instead of leaving the whole
  // Photos page — without this, "back" while previewing navigates to whatever
  // page was open before Photos entirely. Navigating between photos within an
  // open preview does NOT push more entries — only the open/close transition
  // does, tracked via this ref rather than re-running per photo.
  const historyPushedRef = useRef(false);
  useEffect(() => {
    if (previewPhoto && !historyPushedRef.current) {
      window.history.pushState({ kinviaPhotoPreview: true }, "");
      historyPushedRef.current = true;
    }
  }, [Boolean(previewPhoto)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handlePopState = () => {
      if (historyPushedRef.current) {
        historyPushedRef.current = false;
        setPreviewPhotoId(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const closePreview = () => {
    if (historyPushedRef.current) {
      // Consumes the pushed entry; the resulting popstate event's handler
      // above clears previewPhotoId, so don't also set it here.
      window.history.back();
    } else {
      setPreviewPhotoId(null);
    }
  };

  const goPrev = () => {
    if (hasPrev) {
      setSlideDirection(-1);
      setPreviewPhotoId(photos[previewIndex - 1].id);
    }
  };
  const goNext = () => {
    if (hasNext) {
      setSlideDirection(1);
      setPreviewPhotoId(photos[previewIndex + 1].id);
    }
  };

  // The thumbnail is already in the browser cache (it's what the grid just
  // showed), so it paints instantly — the full photoUrl loads behind it and
  // fades in when ready, instead of the swipe waiting on a fresh network
  // fetch before showing anything.
  useEffect(() => {
    setFullImageLoaded(false);
  }, [previewPhotoId]);

  // Preload the neighbors' full images so consecutive swipes are instant too.
  useEffect(() => {
    if (previewIndex < 0) return;
    [photos[previewIndex - 1], photos[previewIndex + 1]].forEach((neighbor) => {
      if (!neighbor) return;
      const img = new Image();
      img.src = neighbor.photoUrl;
    });
  }, [previewIndex, photos]);

  useEffect(() => {
    if (!previewPhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewPhotoId, photos]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (startX === null) return;
    const deltaX = (e.changedTouches[0]?.clientX ?? startX) - startX;
    if (deltaX > SWIPE_THRESHOLD_PX) goPrev();
    else if (deltaX < -SWIPE_THRESHOLD_PX) goNext();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (photos.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  const closeMenu = () => setMenuAnchor(null);

  const handleVisibilitySelect = async (visibility: PhotoVisibility) => {
    const photo = menuAnchor?.photo;
    closeMenu();
    if (!photo || !onChangeVisibility || photo.visibility === visibility) return;
    setBusyId(photo.id);
    try {
      await onChangeVisibility(photo.id, visibility);
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    const photo = confirmDeletePhoto;
    setConfirmDeletePhoto(null);
    if (!photo || !onDelete) return;

    // Deleting the photo currently open in the preview: decide what to show
    // next (or close) before it disappears from `photos`.
    if (previewPhotoId === photo.id) {
      const idx = photos.findIndex((p) => p.id === photo.id);
      const fallback = photos[idx + 1] || photos[idx - 1] || null;
      if (fallback) {
        setPreviewPhotoId(fallback.id);
      } else {
        closePreview();
      }
    }

    setBusyId(photo.id);
    try {
      await onDelete(photo.id);
    } finally {
      setBusyId(null);
    }
  };

  const canManagePreview =
    previewPhoto && onDelete && currentUserId && previewPhoto.createdBy === currentUserId;

  return (
    <Box>
      {groups.map((group) => (
        <Box key={group.label} sx={{ mb: 3 }}>
          <Typography
            variant="overline"
            sx={{ color: "text.secondary", letterSpacing: 0.6, display: "block", mb: 1 }}
          >
            {group.label}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                sm: "repeat(3, 1fr)",
                md: "repeat(4, 1fr)",
                lg: "repeat(5, 1fr)",
              },
              gap: { xs: 1, sm: 1.5 },
            }}
          >
            {group.photos.map((photo) => {
              const canManage = onChangeVisibility && currentUserId && photo.createdBy === currentUserId;
              const visMeta = VISIBILITY_META[photo.visibility];
              return (
                <Box
                  key={photo.id}
                  sx={{
                    position: "relative",
                    aspectRatio: "1",
                    borderRadius: 2,
                    overflow: "hidden",
                    bgcolor: brand.canvas,
                    border: `1px solid ${brand.border}`,
                    opacity: busyId === photo.id ? 0.5 : 1,
                  }}
                >
                  <Box
                    component="img"
                    src={photo.thumbUrl}
                    alt=""
                    loading="lazy"
                    onClick={() => setPreviewPhotoId(photo.id)}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      cursor: "pointer",
                      display: "block",
                    }}
                  />
                  <Tooltip title={visMeta.label}>
                    <Box
                      sx={{
                        position: "absolute",
                        top: 6,
                        left: 6,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        bgcolor: "rgba(15, 23, 42, 0.55)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                      }}
                    >
                      {visMeta.icon}
                    </Box>
                  </Tooltip>
                  {canManage && (
                    <IconButton
                      size="small"
                      onClick={(e) => setMenuAnchor({ el: e.currentTarget, photo })}
                      sx={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        bgcolor: "rgba(15, 23, 42, 0.55)",
                        color: "#fff",
                        "&:hover": { bgcolor: "rgba(15, 23, 42, 0.75)" },
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      ))}

      <Menu anchorEl={menuAnchor?.el} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem disabled sx={{ opacity: "1 !important" }}>
          <Typography variant="caption" color="text.secondary">
            Who can see this photo
          </Typography>
        </MenuItem>
        {(Object.keys(VISIBILITY_META) as PhotoVisibility[]).map((visibility) => (
          <MenuItem key={visibility} onClick={() => handleVisibilitySelect(visibility)}>
            <ListItemIcon>{VISIBILITY_META[visibility].icon}</ListItemIcon>
            <ListItemText>{VISIBILITY_META[visibility].label}</ListItemText>
            {menuAnchor?.photo.visibility === visibility && <CheckIcon fontSize="small" color="primary" />}
          </MenuItem>
        ))}
        {onDelete && (
          <MenuItem
            onClick={() => {
              const photo = menuAnchor?.photo || null;
              closeMenu();
              setConfirmDeletePhoto(photo);
            }}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon sx={{ color: "error.main" }}>
              <DeleteOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <Dialog
        open={Boolean(confirmDeletePhoto)}
        onClose={() => setConfirmDeletePhoto(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogContent sx={{ pt: 3.5, pb: 1, textAlign: "center" }}>
          {confirmDeletePhoto && (
            <Box
              component="img"
              src={confirmDeletePhoto.thumbUrl}
              alt=""
              sx={{
                width: 88,
                height: 88,
                objectFit: "cover",
                borderRadius: 2.5,
                display: "block",
                mx: "auto",
                mb: 2,
                border: `1px solid ${brand.border}`,
              }}
            />
          )}
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: "rgba(211, 47, 47, 0.1)",
              color: "error.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 1.5,
            }}
          >
            <WarningAmberRoundedIcon />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Delete this photo?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            It will be permanently removed and can't be recovered.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column-reverse", sm: "row" }, gap: 1, p: 2.5, pt: 1.5 }}>
          <Button
            fullWidth
            onClick={() => setConfirmDeletePhoto(null)}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            sx={{ textTransform: "none" }}
          >
            Delete photo
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(previewPhoto)}
        onClose={closePreview}
        fullScreen={fullScreenPreview}
        maxWidth="lg"
        fullWidth={!fullScreenPreview}
        PaperProps={{
          sx: fullScreenPreview
            ? { bgcolor: "#000" }
            : { bgcolor: "#000", borderRadius: 2, overflow: "hidden" },
        }}
      >
        {previewPhoto && (
          <Box
            sx={{ position: "relative", height: fullScreenPreview ? "100%" : "85vh" }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Top bar */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 1,
                py: 0.5,
                background: "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0))",
              }}
            >
              <IconButton onClick={closePreview} sx={{ color: "#fff" }} aria-label="Close">
                <CloseIcon />
              </IconButton>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                {previewIndex + 1} / {photos.length}
              </Typography>
              {canManagePreview ? (
                <IconButton
                  onClick={() => setConfirmDeletePhoto(previewPhoto)}
                  sx={{ color: "#fff" }}
                  aria-label="Delete photo"
                >
                  <DeleteOutlineIcon />
                </IconButton>
              ) : (
                <Box sx={{ width: 40 }} />
              )}
            </Box>

            <Box
              key={previewPhoto.id}
              sx={{
                position: "relative",
                width: "100%",
                height: "100%",
                "@media (prefers-reduced-motion: no-preference)": {
                  animation: `${slideDirection === 1 ? slideFromRight : slideFromLeft} 220ms ease`,
                },
              }}
            >
              {/* Instant paint: the thumbnail is already cached from the grid.
                  Softened so its upscaled pixelation isn't distracting while
                  the sharp full image loads in behind it. */}
              <Box
                component="img"
                src={previewPhoto.thumbUrl}
                alt=""
                sx={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  filter: "blur(6px)",
                  transform: "scale(1.03)",
                  userSelect: "none",
                }}
              />
              <Box
                component="img"
                src={previewPhoto.photoUrl}
                alt=""
                onLoad={() => setFullImageLoaded(true)}
                sx={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                  userSelect: "none",
                  opacity: fullImageLoaded ? 1 : 0,
                  transition: "opacity 180ms ease",
                }}
              />
              {!fullImageLoaded && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CircularProgress size={28} sx={{ color: "rgba(255,255,255,0.85)" }} />
                </Box>
              )}
            </Box>

            {hasPrev && (
              <IconButton
                onClick={goPrev}
                aria-label="Previous photo"
                sx={{
                  position: "absolute",
                  left: { xs: 4, sm: 12 },
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#fff",
                  bgcolor: "rgba(15, 23, 42, 0.4)",
                  "&:hover": { bgcolor: "rgba(15, 23, 42, 0.6)" },
                  display: { xs: "none", sm: "inline-flex" },
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
            )}
            {hasNext && (
              <IconButton
                onClick={goNext}
                aria-label="Next photo"
                sx={{
                  position: "absolute",
                  right: { xs: 4, sm: 12 },
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#fff",
                  bgcolor: "rgba(15, 23, 42, 0.4)",
                  "&:hover": { bgcolor: "rgba(15, 23, 42, 0.6)" },
                  display: { xs: "none", sm: "inline-flex" },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            )}
          </Box>
        )}
      </Dialog>
    </Box>
  );
}

export default PhotoGrid;
