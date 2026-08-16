import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Stack,
  TextField,
  Button,
  Typography,
  Alert,
  DialogTitle,
  IconButton,
  InputAdornment,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Close, LockOutlined, PhoneIphone, VerifiedUserOutlined } from "@mui/icons-material";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { firebaseAuth } from "../../firebase";
import { ApiService } from "../../services/apiService";

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

      // Record the login (best-effort — never block sign-in on this).
      try {
        await ApiService.recordLoginEvent();
      } catch (loginEventErr) {
        console.warn("Failed to record login event:", loginEventErr);
      }

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
      BackdropProps={{
        sx: {
          background:
            "linear-gradient(135deg, rgba(15, 23, 42, 0.72), rgba(13, 110, 253, 0.18))",
          backdropFilter: "blur(10px)",
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          overflow: "hidden",
          boxShadow: isMobile
            ? "none"
            : "0 24px 80px rgba(15, 23, 42, 0.28)",
          border: isMobile ? 0 : "1px solid rgba(255,255,255,0.7)",
        },
      }}
    >
      <DialogTitle
        sx={{
          p: 0,
          background:
            "linear-gradient(135deg, #f8fafc 0%, #eef7f1 46%, #fff7ed 100%)",
          borderBottom: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <Box
          sx={{
            position: "relative",
            p: { xs: 2.25, sm: 3 },
            pr: { xs: 6, sm: 7 },
          }}
        >
          <IconButton
            aria-label="Close login"
            onClick={handleClose}
            size="small"
            sx={{
              position: "absolute",
              top: 14,
              right: 14,
              bgcolor: "rgba(255,255,255,0.72)",
              "&:hover": { bgcolor: "#ffffff" },
            }}
          >
            <Close />
          </IconButton>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              component="img"
              src="/favicon2.png"
              alt="Kinvia"
              sx={{
                width: 58,
                height: 58,
                borderRadius: 2,
                boxShadow: "0 10px 26px rgba(15,23,42,0.16)",
                bgcolor: "#fff",
              }}
            />
            <Box>
              <Typography
                variant="overline"
                sx={{
                  color: "#0f766e",
                  fontWeight: 800,
                  letterSpacing: 0.4,
                  lineHeight: 1,
                }}
              >
                Kinvia
              </Typography>
              <Typography
                variant={isMobile ? "h5" : "h4"}
                sx={{ fontWeight: 900, letterSpacing: 0, color: "#0f172a" }}
              >
                Welcome back
              </Typography>
              <Typography variant="body2" sx={{ color: "#475569", mt: 0.5 }}>
                Sign in securely to continue your family story.
              </Typography>
            </Box>
          </Stack>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          p: { xs: 2.25, sm: 3 },
          bgcolor: "#ffffff",
        }}
      >
        <Box>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            sx={{ mb: 2.5 }}
          >
            {[
              { icon: <VerifiedUserOutlined sx={{ fontSize: 16 }} />, label: "Verified access" },
              { icon: <LockOutlined sx={{ fontSize: 16 }} />, label: "OTP protected" },
            ].map((item) => (
              <Box
                key={item.label}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.2,
                  py: 0.65,
                  borderRadius: 999,
                  bgcolor: "#f8fafc",
                  border: "1px solid rgba(15,23,42,0.08)",
                  color: "#334155",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {item.icon}
                {item.label}
              </Box>
            ))}
          </Stack>

          {successMessage && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              {successMessage}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
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
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  minHeight: 58,
                  borderRadius: 2,
                  bgcolor: "#fbfdff",
                },
              }}
              disabled={loading || !!confirmationResult}
              inputProps={{
                inputMode: "numeric",
                pattern: "[0-9]*",
                maxLength: 10,
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <PhoneIphone sx={{ fontSize: 18, color: "#0f766e" }} />
                      <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                        +91
                      </Typography>
                    </Stack>
                  </InputAdornment>
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
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    minHeight: 58,
                    borderRadius: 2,
                    bgcolor: "#fbfdff",
                  },
                }}
                type="password"
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined sx={{ fontSize: 18, color: "#0f766e" }} />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{
                minHeight: 48,
                px: 4,
                mb: 1.25,
                borderRadius: 2,
                bgcolor: "#0d6efd",
                boxShadow: "0 10px 20px rgba(13,110,253,0.22)",
                fontWeight: 800,
                textTransform: "none",
                "&:hover": {
                  bgcolor: "#0b5ed7",
                  boxShadow: "0 12px 22px rgba(13,110,253,0.26)",
                },
              }}
            >
              {loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : confirmationResult ? (
                "Verify OTP"
              ) : (
                "Send OTP"
              )}
            </Button>

            {confirmationResult && (
              <>
                <Button
                  variant="text"
                  fullWidth
                  onClick={handleResendOtp}
                  disabled={loading || resendCooldownSeconds > 0}
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
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
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                >
                  Use different phone number
                </Button>
              </>
            )}
          </form>

          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 2,
              color: "#64748b",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            We use your phone number only to verify your Kinvia account access.
          </Typography>
          <Box ref={recaptchaContainerRef} sx={{ mt: 1 }} />
        </Box>
      </DialogContent>
    </Dialog>
  );
};
