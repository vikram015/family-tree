import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  DialogTitle,
  IconButton,
  InputAdornment,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { firebaseAuth } from "../../firebase";

const OTP_RESEND_BASE_DELAY_SECONDS = 30;
const OTP_RESEND_MAX_DELAY_SECONDS = 5 * 60;

function getOtpResendDelaySeconds(sendCount: number) {
  if (sendCount <= 0) {
    return 0;
  }

  return Math.min(
    OTP_RESEND_BASE_DELAY_SECONDS * 2 ** (sendCount - 1),
    OTP_RESEND_MAX_DELAY_SECONDS,
  );
}

function formatCooldown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

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
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [otpSendCount, setOtpSendCount] = useState(0);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  const clearRecaptcha = () => {
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
  };

  const initializeRecaptcha = async () => {
    if (!recaptchaContainerRef.current) {
      throw new Error("reCAPTCHA container not ready. Please try again.");
    }

    // Firebase app-verification tokens are one-time use, so create a fresh
    // verifier for each OTP send/resend attempt.
    clearRecaptcha();

    recaptchaRef.current = new RecaptchaVerifier(
      firebaseAuth,
      recaptchaContainerRef.current,
      {
        size: "invisible",
        callback: () => {},
        "expired-callback": () => {
          setError("reCAPTCHA expired. Please try again.");
          clearRecaptcha();
        },
      },
    );

    await recaptchaRef.current.render();
  };

  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, []);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setResendCooldownSeconds((currentSeconds) =>
        currentSeconds > 0 ? currentSeconds - 1 : 0,
      );
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [resendCooldownSeconds]);

  const resetOtpFlow = () => {
    setOtp("");
    setConfirmationResult(null);
    setOtpSendCount(0);
    setResendCooldownSeconds(0);
  };

  const sendOtp = async () => {
    if (confirmationResult && resendCooldownSeconds > 0) {
      setError(
        `Please wait ${formatCooldown(resendCooldownSeconds)} before requesting another OTP.`,
      );
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit mobile number");
      return false;
    }

    const fullPhoneNumber = `+91${phone}`;

    try {
      setError("");
      setSuccessMessage("");
      setLoading(true);

      await initializeRecaptcha();

      if (!recaptchaRef.current) {
        throw new Error("reCAPTCHA failed to initialize. Please try again.");
      }

      const result = await signInWithPhoneNumber(
        firebaseAuth,
        fullPhoneNumber,
        recaptchaRef.current,
      );
      setConfirmationResult(result);
      const nextSendCount = otpSendCount + 1;
      const nextCooldownSeconds = getOtpResendDelaySeconds(nextSendCount);
      setOtpSendCount(nextSendCount);
      setResendCooldownSeconds(nextCooldownSeconds);
      setSuccessMessage(
        nextSendCount === 1
          ? "OTP sent successfully."
          : `OTP resent successfully. You can request another code in ${formatCooldown(nextCooldownSeconds)}.`,
      );
      return true;
    } catch (err: any) {
      clearRecaptcha();
      const code = err?.code || "";
      const message = err?.message || "Failed to send OTP";
      // Keep detailed error visible for debugging auth misconfiguration issues.
      // eslint-disable-next-line no-console
      console.error("Phone auth send OTP failed", {
        err,
        code,
        message,
        fullPhoneNumber,
      });
      if (
        code === "auth/invalid-app-credential" ||
        message.includes("INVALID_APP_CREDENTIAL")
      ) {
        setError(
          "Firebase rejected app credentials (auth/invalid-app-credential). Check Authorized Domains, Phone provider is enabled, and API key restrictions allow Identity Toolkit.",
        );
      } else if (code === "auth/captcha-check-failed") {
        setError("reCAPTCHA verification failed. Reload and try again.");
      } else if (code === "auth/unauthorized-domain") {
        setError(
          "Current domain is not authorized for Firebase Auth. Add it in Firebase Console > Authentication > Settings > Authorized domains.",
        );
      } else {
        setError(code ? `${code}: ${message}` : message);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendOtp();
  };

  const handleResendOtp = async () => {
    await sendOtp();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirmationResult) {
      setError("Please request OTP first");
      return;
    }

    if (!otp.trim()) {
      setError("Please enter OTP");
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setLoading(true);

      await confirmationResult.confirm(otp.trim());

      setPhone("");
      resetOtpFlow();
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    clearRecaptcha();
    setPhone("");
    setError("");
    setSuccessMessage("");
    resetOtpFlow();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Sign In with Phone</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={confirmationResult ? handleVerifyOtp : handleSendOtp}>
            <TextField
              label="Mobile Number"
              fullWidth
              variant="outlined"
              value={phone}
              onChange={(e) => {
                const digitsOnly = e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10);
                setPhone(digitsOnly);
              }}
              placeholder="9876543210"
              sx={{ mb: 2 }}
              disabled={loading || !!confirmationResult}
              inputProps={{
                inputMode: "numeric",
                pattern: "[0-9]*",
                maxLength: 10,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">+91</InputAdornment>
                ),
              }}
            />

            {confirmationResult && (
              <TextField
                label="OTP"
                fullWidth
                variant="outlined"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter verification code"
                sx={{ mb: 2 }}
                type="password"
                disabled={loading}
              />
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mb: 1 }}
            >
              {loading
                ? "Processing..."
                : confirmationResult
                  ? "Verify OTP"
                  : "Send OTP"}
            </Button>

            {confirmationResult && (
              <>
                <Button
                  variant="text"
                  fullWidth
                  onClick={handleResendOtp}
                  disabled={loading || resendCooldownSeconds > 0}
                >
                  {resendCooldownSeconds > 0
                    ? `Resend OTP in ${formatCooldown(resendCooldownSeconds)}`
                    : "Resend OTP"}
                </Button>

                <Button
                  variant="text"
                  fullWidth
                  onClick={() => {
                    resetOtpFlow();
                    setSuccessMessage("");
                    setError("");
                  }}
                  disabled={loading}
                >
                  Use different phone number
                </Button>
              </>
            )}
          </form>

          <Box ref={recaptchaContainerRef} sx={{ mt: 1 }} />
        </Box>
      </DialogContent>
    </Dialog>
  );
};
