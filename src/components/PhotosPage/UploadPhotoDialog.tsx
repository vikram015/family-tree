import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  LinearProgress,
  AppBar,
  Toolbar,
  IconButton,
  Slide,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import CloseIcon from "@mui/icons-material/Close";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ApiService, FamilyPhoto, PhotoVisibility } from "../../services/apiService";
import { brand } from "../../theme/brand";

interface UploadPhotoDialogProps {
  open: boolean;
  onClose: () => void;
  personId: string;
  personName?: string;
  maxFileSizeBytes: number;
  /** Called once per batch, with every photo that uploaded successfully. */
  onUploaded: (photos: FamilyPhoto[]) => void;
  /** Pre-seeds the file list, e.g. from a drop on the page before the dialog was open. */
  initialFiles?: File[] | null;
}

type FileStatus = "idle" | "uploading" | "done" | "error";

interface SelectedFile {
  id: string;
  file: File;
  previewUrl: string;
  clientError: string | null;
  status: FileStatus;
  errorMessage?: string;
}

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const SlideUpTransition = forwardRef(function SlideUpTransition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export function UploadPhotoDialog({
  open,
  onClose,
  personId,
  personName,
  maxFileSizeBytes,
  onUploaded,
  initialFiles,
}: UploadPhotoDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [visibility, setVisibility] = useState<PhotoVisibility>("private");
  const [isDragActive, setIsDragActive] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setSelectedFiles([]);
    setVisibility("private");
    setBatchError(null);
    setUploading(false);
  };

  const handleClose = () => {
    if (uploading) return;
    reset();
    onClose();
  };

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      if (incoming.length === 0) return;
      setBatchError(null);
      const next: SelectedFile[] = incoming.map((file) => {
        let clientError: string | null = null;
        if (!file.type.startsWith("image/")) {
          clientError = "Not an image file";
        } else if (file.size > maxFileSizeBytes) {
          clientError = `Over the ${formatMb(maxFileSizeBytes)} limit`;
        }
        return {
          id: makeId(),
          file,
          previewUrl: URL.createObjectURL(file),
          clientError,
          status: "idle",
        };
      });
      setSelectedFiles((prev) => [...prev, ...next]);
    },
    [maxFileSizeBytes],
  );

  // Seed from files dropped on the page before this dialog was even open. Reads
  // the latest prop via a ref (not a dep) so it fires exactly once per open —
  // not on every re-render caused by a new `initialFiles` array reference.
  const initialFilesRef = useRef(initialFiles);
  initialFilesRef.current = initialFiles;
  useEffect(() => {
    if (open && initialFilesRef.current && initialFilesRef.current.length > 0) {
      addFiles(initialFilesRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const updateFile = (id: string, patch: Partial<SelectedFile>) => {
    setSelectedFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    const toUpload = selectedFiles.filter((f) => !f.clientError && f.status !== "done");
    if (toUpload.length === 0) return;
    setUploading(true);
    setBatchError(null);
    const successful: FamilyPhoto[] = [];

    for (const item of toUpload) {
      updateFile(item.id, { status: "uploading", errorMessage: undefined });
      try {
        const photo = await ApiService.uploadFamilyPhoto(personId, item.file, visibility);
        updateFile(item.id, { status: "done" });
        successful.push(photo);
      } catch (error) {
        updateFile(item.id, {
          status: "error",
          errorMessage: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }

    setUploading(false);
    if (successful.length > 0) onUploaded(successful);

    const stillPending = selectedFiles.length - successful.length;
    if (successful.length === toUpload.length && stillPending <= 0) {
      reset();
      onClose();
    } else if (successful.length < toUpload.length) {
      setBatchError(
        `${successful.length} of ${toUpload.length} uploaded. Fix or remove the rest and try again.`,
      );
    }
  };

  const uploadableCount = selectedFiles.filter((f) => !f.clientError && f.status !== "done").length;
  const title = `Add photos${personName ? ` of ${personName}` : ""}`;

  const body = (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose who can see these photos — you can change it anytime after uploading.
      </Typography>

      <ToggleButtonGroup
        value={visibility}
        exclusive
        fullWidth
        size="small"
        onChange={(_e, value) => value && setVisibility(value)}
        sx={{ mb: 2.5 }}
      >
        <ToggleButton value="private" sx={{ textTransform: "none", flexDirection: "column", py: 1 }}>
          <LockOutlinedIcon fontSize="small" />
          <Typography variant="caption" sx={{ mt: 0.3 }}>Private</Typography>
        </ToggleButton>
        <ToggleButton value="family" sx={{ textTransform: "none", flexDirection: "column", py: 1 }}>
          <GroupsOutlinedIcon fontSize="small" />
          <Typography variant="caption" sx={{ mt: 0.3 }}>Family</Typography>
        </ToggleButton>
      </ToggleButtonGroup>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleFileInputChange}
      />

      <Box
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        sx={{
          border: `1.5px dashed ${isDragActive ? brand.primary : brand.border}`,
          borderRadius: 2,
          py: 3.5,
          textAlign: "center",
          cursor: "pointer",
          color: isDragActive ? brand.primary : "text.secondary",
          bgcolor: isDragActive ? brand.primarySoft : "transparent",
          transition: "border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease",
          "&:hover": { borderColor: brand.primary, color: brand.primary },
        }}
      >
        <ImageOutlinedIcon fontSize="large" />
        <Typography variant="body2" sx={{ mt: 1 }}>
          {isDragActive ? "Drop to add" : "Tap to choose, or drag photos here"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Multiple photos allowed · up to {formatMb(maxFileSizeBytes)} each
        </Typography>
      </Box>

      {selectedFiles.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))",
            gap: 1,
            mt: 2,
          }}
        >
          {selectedFiles.map((f) => (
            <Box key={f.id} sx={{ position: "relative" }}>
              <Box
                sx={{
                  aspectRatio: "1",
                  borderRadius: 1.5,
                  overflow: "hidden",
                  border: `1px solid ${f.clientError || f.status === "error" ? theme.palette.error.main : brand.border}`,
                  opacity: f.status === "uploading" ? 0.6 : 1,
                }}
              >
                <Box
                  component="img"
                  src={f.previewUrl}
                  alt=""
                  sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </Box>

              {f.status === "uploading" && (
                <Box
                  sx={{
                    position: "absolute", inset: 0, display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Box sx={{ width: "60%" }}>
                    <LinearProgress />
                  </Box>
                </Box>
              )}
              {f.status === "done" && (
                <CheckCircleIcon
                  color="success"
                  sx={{ position: "absolute", bottom: 2, right: 2, bgcolor: "#fff", borderRadius: "50%", fontSize: 18 }}
                />
              )}
              {(f.status === "error" || f.clientError) && (
                <ErrorOutlineIcon
                  color="error"
                  sx={{ position: "absolute", bottom: 2, right: 2, bgcolor: "#fff", borderRadius: "50%", fontSize: 18 }}
                />
              )}
              {f.status !== "uploading" && f.status !== "done" && (
                <IconButton
                  size="small"
                  onClick={() => removeFile(f.id)}
                  sx={{
                    position: "absolute", top: -6, right: -6, width: 20, height: 20,
                    bgcolor: "rgba(15, 23, 42, 0.7)", color: "#fff",
                    "&:hover": { bgcolor: "rgba(15, 23, 42, 0.9)" },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 13 }} />
                </IconButton>
              )}
              {(f.clientError || f.errorMessage) && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ display: "block", mt: 0.4, fontSize: 10, lineHeight: 1.2 }}
                >
                  {f.clientError || f.errorMessage}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}

      {batchError && (
        <Alert severity="warning" icon={<RefreshIcon fontSize="small" />} sx={{ mt: 2 }}>
          {batchError}
        </Alert>
      )}
      {uploading && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          Uploading…
        </Typography>
      )}
    </>
  );

  const uploadButtonLabel = uploading
    ? "Uploading…"
    : uploadableCount > 1
      ? `Upload ${uploadableCount} photos`
      : "Upload";

  if (fullScreen) {
    return (
      <Dialog open={open} onClose={handleClose} fullScreen TransitionComponent={SlideUpTransition}>
        <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: `1px solid ${brand.border}` }}>
          <Toolbar>
            <IconButton edge="start" onClick={handleClose} disabled={uploading} aria-label="Close">
              <CloseIcon />
            </IconButton>
            <Typography variant="subtitle1" sx={{ ml: 1, flex: 1, fontWeight: 700 }} noWrap>
              {title}
            </Typography>
            <Button variant="contained" onClick={handleUpload} disabled={uploadableCount === 0 || uploading}>
              {uploadButtonLabel}
            </Button>
          </Toolbar>
        </AppBar>
        <DialogContent sx={{ pt: 2.5 }}>{body}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{body}</DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleUpload} disabled={uploadableCount === 0 || uploading}>
          {uploadButtonLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default UploadPhotoDialog;
