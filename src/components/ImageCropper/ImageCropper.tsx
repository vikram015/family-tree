import React, { useState, useCallback, useRef } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Slider,
  Typography,
  IconButton,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import DeleteIcon from "@mui/icons-material/Delete";

/**
 * Utility: creates a cropped image from the source image and crop area.
 * Returns a Blob (square image).
 */
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Output a square image at the cropped size (max 400px for efficiency)
  const outputSize = Math.min(pixelCrop.width, 400);
  canvas.width = outputSize;
  canvas.height = outputSize;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/jpeg",
      0.85,
    );
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (err) => reject(err));
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

interface ImageCropperProps {
  /** Current photo URL (to display preview) */
  currentPhoto?: string;
  /** Called with the cropped blob when user confirms crop */
  onCropped: (blob: Blob) => void;
  /** Called when user removes the photo */
  onRemove?: () => void;
  /** Whether upload is in progress */
  uploading?: boolean;
  /** Size of the preview circle */
  previewSize?: number;
  /** Visual style for the preview */
  previewVariant?: "circle" | "rounded";
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  currentPhoto,
  onCropped,
  onRemove,
  uploading = false,
  previewSize = 80,
  previewVariant = "circle",
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile/touch device for showing camera button
  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    [],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result as string);
        setDialogOpen(true);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      });
      reader.readAsDataURL(file);

      // Reset input so re-selecting same file still triggers
      e.target.value = "";
    },
    [],
  );

  const handleConfirmCrop = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropped(croppedBlob);
      setDialogOpen(false);
      setImageSrc(null);
    } catch (err) {
      console.error("Crop error:", err);
    }
  }, [imageSrc, croppedAreaPixels, onCropped]);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    setImageSrc(null);
  }, []);

  const previewRadius = previewVariant === "rounded" ? "24px" : "50%";

  return (
    <>
      {/* Preview + Upload trigger */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: previewSize,
            height: previewSize,
          }}
        >
          {currentPhoto ? (
            <img
              src={currentPhoto}
              alt="Profile"
              style={{
                width: previewSize,
                height: previewSize,
                borderRadius: previewRadius,
                objectFit: "cover",
                border: "2px solid #e0e0e0",
              }}
            />
          ) : (
            <Box
              sx={{
                width: previewSize,
                height: previewSize,
                borderRadius: previewRadius,
                bgcolor: "action.hover",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px dashed #bdbdbd",
              }}
            >
              <CameraAltIcon sx={{ color: "text.disabled", fontSize: 28 }} />
            </Box>
          )}

          {uploading && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: previewSize,
                height: previewSize,
                borderRadius: previewRadius,
                bgcolor: "rgba(255,255,255,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={24} />
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {/* Gallery / file picker */}
          <Button
            size="small"
            variant="outlined"
            startIcon={<PhotoLibraryIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {currentPhoto ? "Change" : "Gallery"}
          </Button>

          {/* Camera button — only shown on touch devices */}
          {isTouchDevice && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<CameraAltIcon />}
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
            >
              Camera
            </Button>
          )}

          {currentPhoto && onRemove && (
            <IconButton
              size="small"
              color="error"
              onClick={onRemove}
              disabled={uploading}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* Hidden file input — gallery / file picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {/* Hidden file input — camera capture (mobile) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </Box>

      {/* Crop Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { overflow: "hidden" } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">Crop Photo</Typography>
          <IconButton onClick={handleCancel} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {imageSrc && (
            <>
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: 350,
                  bgcolor: "#333",
                }}
              >
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </Box>
              <Box sx={{ px: 3, py: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Zoom
                </Typography>
                <Slider
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(_, value) => setZoom(value as number)}
                  size="small"
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Cancel</Button>
          <Button
            onClick={handleConfirmCrop}
            variant="contained"
            disabled={!croppedAreaPixels}
          >
            Crop & Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ImageCropper;
