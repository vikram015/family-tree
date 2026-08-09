import React, { useState, useCallback, useRef, useEffect } from "react";
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
  Alert,
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
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const supportsCameraApi =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";
  const prefersNativeCameraCapture =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    [],
  );

  const stopCameraStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

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

  const handleOpenCamera = useCallback(async () => {
    if (prefersNativeCameraCapture || !supportsCameraApi) {
      cameraInputRef.current?.click();
      return;
    }

    setCameraError("");
    setIsStartingCamera(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "user" },
        },
        audio: false,
      });

      stopCameraStream();
      streamRef.current = stream;
      setCameraDialogOpen(true);
    } catch (primaryError) {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        stopCameraStream();
        streamRef.current = fallbackStream;
        setCameraDialogOpen(true);
      } catch (fallbackError) {
        const error =
          fallbackError instanceof Error
            ? fallbackError
            : primaryError instanceof Error
              ? primaryError
              : new Error("Unable to access camera");
        setCameraError(error.message || "Unable to access camera");
      }
    } finally {
      setIsStartingCamera(false);
    }
  }, [prefersNativeCameraCapture, stopCameraStream, supportsCameraApi]);

  useEffect(() => {
    if (!cameraDialogOpen || !videoRef.current || !streamRef.current) {
      return;
    }

    const video = videoRef.current;
    video.srcObject = streamRef.current;

    const handleLoadedMetadata = () => {
      void video.play().catch((error) => {
        setCameraError(
          error instanceof Error
            ? error.message
            : "Unable to start camera preview",
        );
      });
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.srcObject = null;
    };
  }, [cameraDialogOpen]);

  const handleCloseCamera = useCallback(() => {
    setCameraDialogOpen(false);
    stopCameraStream();
  }, [stopCameraStream]);

  const handleCapturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      setCameraError("Camera preview is not ready yet. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Unable to capture image from camera.");
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const captured = canvas.toDataURL("image/jpeg", 0.92);
    setImageSrc(captured);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setDialogOpen(true);
    handleCloseCamera();
  }, [handleCloseCamera]);

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

          <Button
            size="small"
            variant="outlined"
            startIcon={<CameraAltIcon />}
            onClick={handleOpenCamera}
            disabled={uploading || isStartingCamera}
          >
            Camera
          </Button>

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
          capture="user"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </Box>

      <Dialog
        open={cameraDialogOpen}
        onClose={handleCloseCamera}
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
          <Typography variant="h6">Take Photo</Typography>
          <IconButton onClick={handleCloseCamera} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box
            sx={{
              position: "relative",
              width: "100%",
              bgcolor: "#111",
              minHeight: 320,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                maxHeight: 420,
                objectFit: "cover",
              }}
            />
          </Box>
          {cameraError && (
            <Box sx={{ p: 2 }}>
              <Alert severity="error">{cameraError}</Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCamera}>Cancel</Button>
          <Button onClick={handleCapturePhoto} variant="contained">
            Capture
          </Button>
        </DialogActions>
      </Dialog>

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
                  objectFit="cover"
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
