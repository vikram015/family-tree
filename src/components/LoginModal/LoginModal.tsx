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
} from "@mui/material";
import { Close } from "@mui/icons-material";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { firebaseAuth } from "../../firebase";

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

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  const initializeRecaptcha = async () => {
    if (!recaptchaContainerRef.current) {
      throw new Error("reCAPTCHA container not ready. Please try again.");
    }

    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(
        firebaseAuth,
        recaptchaContainerRef.current,
        {
          size: "invisible",
          callback: () => {},
          "expired-callback": () => {
            setError("reCAPTCHA expired. Please try again.");
          },
        },
      );
    }

    await recaptchaRef.current.render();
  };

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
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
      setSuccessMessage("OTP sent successfully.");
    } catch (err: any) {
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
    } finally {
      setLoading(false);
    }
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
      setOtp("");
      setConfirmationResult(null);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
    setPhone("");
    setOtp("");
    setError("");
    setSuccessMessage("");
    setConfirmationResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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
              <Button
                variant="text"
                fullWidth
                onClick={() => {
                  setConfirmationResult(null);
                  setOtp("");
                  setSuccessMessage("");
                  setError("");
                }}
                disabled={loading}
              >
                Use different phone number
              </Button>
            )}
          </form>

          <Box ref={recaptchaContainerRef} sx={{ mt: 1 }} />
        </Box>
      </DialogContent>
    </Dialog>
  );
};
