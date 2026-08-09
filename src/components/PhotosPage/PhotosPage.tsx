import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Fab,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../hooks/useAuth";
import { ApiService, FamilyPhoto, PhotoVisibility, StorageQuotaStatus } from "../../services/apiService";
import { StorageQuotaWidget } from "./StorageQuotaWidget";
import { PhotoGrid } from "./PhotoGrid";
import { UploadPhotoDialog } from "./UploadPhotoDialog";

type TabValue = "mine" | "shared";

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
      sx={{ py: { xs: 3, sm: 4 }, position: "relative" }}
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

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Family Photos
      </Typography>

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

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="mine" label="My Photos" />
        <Tab value="shared" label="Shared with me" />
      </Tabs>

      {tab === "mine" ? (
        <PhotoGrid
          photos={minePhotos}
          loading={loading}
          emptyMessage="You haven't added any photos yet."
          currentUserId={userProfile?.id}
          onChangeVisibility={handleChangeVisibility}
          onDelete={handleDelete}
        />
      ) : (
        <PhotoGrid
          photos={sharedPhotos}
          loading={loading}
          emptyMessage="No photos have been shared with you yet."
          currentUserId={userProfile?.id}
        />
      )}

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
