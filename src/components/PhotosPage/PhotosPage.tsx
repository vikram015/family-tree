import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Container,
  Box,
  Button,
  Typography,
  Tabs,
  Tab,
  Fab,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import SearchIcon from "@mui/icons-material/Search";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import ViewComfyRoundedIcon from "@mui/icons-material/ViewComfyRounded";
import { brand } from "../../theme/brand";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../hooks/useAuth";
import { ApiService, FamilyPhoto, PhotoVisibility, StorageQuotaStatus } from "../../services/apiService";
import { StorageQuotaWidget } from "./StorageQuotaWidget";
import { PhotoGrid } from "./PhotoGrid";
import { UploadPhotoDialog } from "./UploadPhotoDialog";

type TabValue = "mine" | "shared";

/** Detailed cards (the default) vs a tighter wall of thumbnails. */
type ViewMode = "detailed" | "compact";

/** The page background from the design — a hair cooler than the app canvas. */

/**
 * Search, type and year filters run over the photos already in memory.
 *
 * The lists are a single page of the user's own uploads (server-sorted), so
 * filtering client-side keeps every keystroke instant and needs no new
 * endpoint. If these lists ever paginate, this has to move server-side.
 */
function filterPhotos(
  photos: FamilyPhoto[],
  query: string,
  kind: string,
  year: string,
): FamilyPhoto[] {
  const q = query.trim().toLowerCase();

  return photos.filter((photo) => {
    if (kind !== "all") {
      const isImage = (photo.contentType || "").startsWith("image/");
      if (kind === "image" && !isImage) return false;
      if (kind === "document" && isImage) return false;
    }

    if (year !== "all" && String(new Date(photo.createdAt).getFullYear()) !== year) {
      return false;
    }

    if (!q) return true;
    return [photo.personName, photo.uploaderName, photo.visibility]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(q));
  });
}

/**
 * Family photo gallery — separate from the single profile picture. Person-
 * scoped photos with private/family/public visibility, surfaced here (rather
 * than only on each person's profile) so the feature is actually discoverable.
 */
export function PhotosPage() {
  const { userProfile } = useAuth();

  const [tab, setTab] = useState<TabValue>("mine");
  const [minePhotos, setMinePhotos] = useState<FamilyPhoto[]>([]);
  const [sharedPhotos, setSharedPhotos] = useState<FamilyPhoto[]>([]);
  const [quota, setQuota] = useState<StorageQuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; severity: "success" | "error" } | null>(null);
  const [isPageDragActive, setIsPageDragActive] = useState(false);
  const [pendingDropFiles, setPendingDropFiles] = useState<File[] | null>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [year, setYear] = useState("all");
  const [view, setView] = useState<ViewMode>("detailed");
  const dragCounterRef = useRef(0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, shared, quotaStatus] = await Promise.all([
        ApiService.getMyFamilyPhotos(),
        ApiService.getSharedFamilyPhotos(),
        ApiService.getStorageStatus(),
      ]);
      setMinePhotos(mine);
      setSharedPhotos(shared);
      setQuota(quotaStatus);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Failed to load photos",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleUploaded = (photos: FamilyPhoto[]) => {
    setMinePhotos((prev) => [...photos, ...prev]);
    ApiService.getStorageStatus().then(setQuota).catch(() => undefined);
    setToast({
      message:
        photos.length > 1
          ? `${photos.length} photos uploaded — you can change who sees them anytime from the photo menu.`
          : "Photo uploaded — you can change who sees it anytime from the photo menu.",
      severity: "success",
    });
  };

  const handleChangeVisibility = async (photoId: string, visibility: PhotoVisibility) => {
    try {
      await ApiService.updateFamilyPhotoVisibility(photoId, visibility);
      setMinePhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, visibility } : p)),
      );
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Couldn't update visibility",
        severity: "error",
      });
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      await ApiService.deleteFamilyPhoto(photoId);
      setMinePhotos((prev) => prev.filter((p) => p.id !== photoId));
      ApiService.getStorageStatus().then(setQuota).catch(() => undefined);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Couldn't delete photo",
        severity: "error",
      });
    }
  };

  const ownPersonId = userProfile?.peopleId || null;

  const activePhotos = tab === "mine" ? minePhotos : sharedPhotos;
  const visiblePhotos = filterPhotos(activePhotos, query, kind, year);
  const isFiltered = Boolean(query.trim()) || kind !== "all" || year !== "all";

  // Only the years that actually have photos — an empty year in the dropdown is
  // a dead end.
  const years = Array.from(
    new Set(activePhotos.map((photo) => new Date(photo.createdAt).getFullYear())),
  )
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a);

  const handlePageDragEnter = (e: React.DragEvent) => {
    if (!ownPersonId || !e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsPageDragActive(true);
  };
  const handlePageDragOver = (e: React.DragEvent) => {
    if (!ownPersonId || !e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
  };
  const handlePageDragLeave = (e: React.DragEvent) => {
    if (!ownPersonId) return;
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsPageDragActive(false);
  };
  const handlePageDrop = (e: React.DragEvent) => {
    if (!ownPersonId) return;
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsPageDragActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    setPendingDropFiles(files);
    setUploadOpen(true);
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: { xs: 3, sm: 4 },
        position: "relative",
        // The page owns its ground so the white cards read as raised on it.
        "&::before": {
          content: '""',
          position: "fixed",
          inset: 0,
          bgcolor: brand.pageCanvas,
          zIndex: -1,
        },
      }}
      onDragEnter={handlePageDragEnter}
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
      onDrop={handlePageDrop}
    >
      <Helmet>
        <title>Photos - Kinvia</title>
      </Helmet>

      {isPageDragActive && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1300,
            bgcolor: "rgba(13, 110, 253, 0.08)",
            backdropFilter: "blur(1px)",
            border: "3px dashed",
            borderColor: "primary.main",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.5,
            pointerEvents: "none",
          }}
        >
          <CloudUploadOutlinedIcon color="primary" sx={{ fontSize: 56 }} />
          <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
            Drop photos to upload
          </Typography>
        </Box>
      )}

      {/* ---- Title and primary actions ----------------------------------- */}
      <Stack
        direction={{ xs: "column", lg: "row" }}
        alignItems={{ xs: "stretch", lg: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 24, sm: 30 },
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: brand.ink,
            }}
          >
            Family photos &amp; keepsakes
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: brand.slate, maxWidth: 640 }}>
            Photographs, scanned documents and keepsakes, kept for the people who
            come after you.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.25} sx={{ flexShrink: 0 }}>
          <Button
            variant="contained"
            disableElevation
            disabled={!ownPersonId}
            onClick={() => setUploadOpen(true)}
            startIcon={<FileUploadOutlinedIcon />}
            sx={{
              minHeight: 42,
              px: 2.25,
              borderRadius: 2.5,
              fontWeight: 700,
              fontSize: 14,
              textTransform: "none",
              bgcolor: brand.primaryDark,
              boxShadow: "0 1px 2px rgba(29, 78, 216, 0.25)",
              "&:hover": { bgcolor: "#1e40af" },
            }}
          >
            Upload keepsake
          </Button>
        </Stack>
      </Stack>

      {!ownPersonId && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Link your account to your profile in a family tree to start adding photos. You can still add
          photos of other relatives from their profile page.
        </Alert>
      )}

      {quota && (
        <Box sx={{ mb: 3 }}>
          <StorageQuotaWidget status={quota} />
        </Box>
      )}

      {/* ---- Tabs -------------------------------------------------------- */}
      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        sx={{
          mb: 2,
          minHeight: 42,
          borderBottom: `1px solid ${brand.border}`,
          "& .MuiTab-root": {
            minHeight: 42,
            px: 0,
            mr: 3,
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: brand.slateMuted,
          },
          "& .Mui-selected": { color: `${brand.primaryDark} !important` },
          "& .MuiTabs-indicator": { height: 2, bgcolor: brand.primaryDark },
        }}
      >
        {([
          { value: "mine" as const, label: "My photos", count: minePhotos.length },
          { value: "shared" as const, label: "Shared with me", count: sharedPhotos.length },
        ]).map((item) => (
          <Tab
            key={item.value}
            value={item.value}
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>{item.label}</span>
                <Box
                  sx={{
                    px: 0.9,
                    py: 0.1,
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    bgcolor: tab === item.value ? "#dbeafe" : "#f1f5f9",
                    color: tab === item.value ? brand.primaryDark : brand.slateMuted,
                  }}
                >
                  {loading ? "–" : item.count}
                </Box>
              </Stack>
            }
          />
        ))}
      </Tabs>

      {/* ---- Search and filters ------------------------------------------ */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{
          mb: 3,
          p: 1.5,
          borderRadius: 3,
          bgcolor: brand.surface,
          border: `1px solid ${brand.border}`,
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        }}
      >
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by the person in the photo, or who added it…"
          size="small"
          sx={{
            flex: 1,
            maxWidth: { md: 460 },
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              bgcolor: "#f8fafc",
              fontSize: 14,
              "& fieldset": { borderColor: brand.border },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: brand.slateMuted }} />
              </InputAdornment>
            ),
          }}
        />

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Select
            value={kind}
            onChange={(e) => setKind(String(e.target.value))}
            size="small"
            sx={{
              borderRadius: 2,
              bgcolor: "#f8fafc",
              fontSize: 13,
              fontWeight: 600,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: brand.border },
            }}
          >
            <MenuItem value="all">All types</MenuItem>
            <MenuItem value="image">Photos</MenuItem>
            <MenuItem value="document">Documents</MenuItem>
          </Select>

          <Select
            value={year}
            onChange={(e) => setYear(String(e.target.value))}
            size="small"
            sx={{
              borderRadius: 2,
              bgcolor: "#f8fafc",
              fontSize: 13,
              fontWeight: 600,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: brand.border },
            }}
          >
            <MenuItem value="all">All years</MenuItem>
            {years.map((value) => (
              <MenuItem key={value} value={String(value)}>
                {value}
              </MenuItem>
            ))}
          </Select>

          <ToggleButtonGroup
            exclusive
            size="small"
            value={view}
            onChange={(_e, next) => next && setView(next)}
            sx={{
              bgcolor: "#f1f5f9",
              borderRadius: 2,
              p: 0.25,
              "& .MuiToggleButton-root": {
                border: 0,
                borderRadius: "8px !important",
                px: 1,
                py: 0.5,
                color: brand.slateMuted,
              },
              "& .Mui-selected": {
                bgcolor: `${brand.surface} !important`,
                color: `${brand.primaryDark} !important`,
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
              },
            }}
          >
            <ToggleButton value="detailed" aria-label="Detailed cards">
              <GridViewRoundedIcon sx={{ fontSize: 17 }} />
            </ToggleButton>
            <ToggleButton value="compact" aria-label="Compact thumbnails">
              <ViewComfyRoundedIcon sx={{ fontSize: 17 }} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <PhotoGrid
        photos={visiblePhotos}
        loading={loading}
        view={view}
        emptyMessage={
          isFiltered
            ? "No keepsakes match these filters."
            : tab === "mine"
              ? "You haven't added any photos yet."
              : "No photos have been shared with you yet."
        }
        currentUserId={userProfile?.id}
        onChangeVisibility={tab === "mine" ? handleChangeVisibility : undefined}
        onDelete={tab === "mine" ? handleDelete : undefined}
      />

      {ownPersonId && quota && (
        <UploadPhotoDialog
          open={uploadOpen}
          onClose={() => {
            setUploadOpen(false);
            setPendingDropFiles(null);
          }}
          personId={ownPersonId}
          personName={userProfile?.name || undefined}
          maxFileSizeBytes={quota.maxFileSizeBytes}
          onUploaded={handleUploaded}
          initialFiles={pendingDropFiles}
        />
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: "100%" }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>

      <Tooltip
        title={ownPersonId ? "Add Photo" : "Link your account to a profile to add photos"}
      >
        <Box
          sx={{
            position: "fixed",
            right: { xs: 16, sm: 24 },
            bottom: { xs: 16, sm: 24 },
            zIndex: 1200,
          }}
        >
          <Fab
            color="primary"
            disabled={!ownPersonId}
            onClick={() => setUploadOpen(true)}
            aria-label="Add Photo"
          >
            <AddPhotoAlternateOutlinedIcon />
          </Fab>
        </Box>
      </Tooltip>
    </Container>
  );
}

export default PhotosPage;
