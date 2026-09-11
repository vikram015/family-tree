import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Stack,
  Typography,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { Close, LockOutlined, VerifiedUserOutlined } from "@mui/icons-material";
import { OTP_LENGTH } from "../../config/otp";
import { brand } from "../../theme/brand";
import { usePhoneOtpAuth } from "./usePhoneOtpAuth";
import { PhoneOtpForm } from "./PhoneOtpForm";

/**
 * Sign-in as a dialog, for the in-app entry points.
 *
 * The flow itself lives in `usePhoneOtpAuth` and `PhoneOtpForm`, shared with the
 * full-page `/login` screen — this component is the dialog chrome around them.
 */

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const auth = usePhoneOtpAuth(onSuccess);
  const { reset } = auth;

  // Reopening should never resume a half-finished attempt with a stale
  // verifier, so the flow is cleared whenever the dialog closes.
  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      scroll="paper"
      BackdropProps={{
        sx: {
          background:
            "linear-gradient(135deg, rgba(15, 23, 42, 0.72), rgba(13, 110, 253, 0.18))",
          backdropFilter: "blur(10px)",
        },
      }}
      PaperProps={{
        sx: {
          // Centered card on every screen (incl. mobile) — never a top-aligned
          // full-screen sheet.
          m: { xs: 2, sm: 3 },
          width: { xs: "calc(100% - 32px)", sm: "100%" },
          maxHeight: { xs: "calc(100% - 32px)", sm: "calc(100% - 48px)" },
          borderRadius: 4,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(15, 23, 42, 0.28)",
          border: "1px solid rgba(255,255,255,0.7)",
        },
      }}
    >
      <DialogTitle
        sx={{
          p: 0,
          background: `linear-gradient(135deg, ${brand.canvas} 0%, ${brand.primarySoft} 46%, ${brand.accentSoft} 100%)`,
          borderBottom: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <Box
          sx={{
            position: "relative",
            p: { xs: 2.75, sm: 3.5 },
            pr: { xs: 6, sm: 7 },
          }}
        >
          <IconButton
            aria-label="Close login"
            onClick={handleClose}
            size="small"
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              bgcolor: "rgba(255,255,255,0.72)",
              "&:hover": { bgcolor: brand.surface },
            }}
          >
            <Close fontSize="small" />
          </IconButton>

          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              component="img"
              src="/favic_no_background.png"
              alt="Kinvia"
              sx={{ width: 34, height: 34, display: "block" }}
            />
            <Typography
              sx={{
                color: brand.primary,
                fontWeight: 800,
                letterSpacing: 2,
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              KINVIA
            </Typography>
          </Stack>

          <Typography
            sx={{
              mt: 2,
              fontWeight: 900,
              fontSize: { xs: 32, sm: 38 },
              lineHeight: 1.1,
              color: brand.ink,
            }}
          >
            {auth.awaitingCode ? "Verify your number" : "Welcome back"}
          </Typography>
          <Typography sx={{ mt: 1, color: brand.slate, fontSize: 15 }}>
            {auth.awaitingCode
              ? `Enter the ${OTP_LENGTH}-digit code we just sent you.`
              : "Sign in securely to continue your family story."}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2.75, sm: 3.5 }, bgcolor: brand.surface }}>
        <Box mt={3}>
          {!auth.awaitingCode && (
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 3 }}>
              {[
                {
                  icon: <VerifiedUserOutlined sx={{ fontSize: 16 }} />,
                  label: "Verified access",
                },
                { icon: <LockOutlined sx={{ fontSize: 16 }} />, label: "OTP protected" },
              ].map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1.4,
                    py: 0.7,
                    borderRadius: 999,
                    bgcolor: brand.canvas,
                    border: "1px solid rgba(15,23,42,0.08)",
                    color: brand.slate,
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  {item.icon}
                  {item.label}
                </Box>
              ))}
            </Stack>
          )}

          <PhoneOtpForm auth={auth} size="modal" />
        </Box>
      </DialogContent>
    </Dialog>
  );
};
