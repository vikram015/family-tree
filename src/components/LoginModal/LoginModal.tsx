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
} from "@mui/material";
import { Close, LockOutlined, VerifiedUserOutlined } from "@mui/icons-material";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { firebaseAuth } from "../../firebase";
import { ApiService } from "../../services/apiService";
import { OtpInput } from "./OtpInput";
import { useSmsOtpAutofill } from "../hooks/useSmsOtpAutofill";
import { OTP_LENGTH } from "../../config/otp";
import { brand } from "../../theme/brand";

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
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  const clearRecaptcha = () => {
    try {
      recaptchaRef.current?.clear();
    } catch {
      // Verifier may already be torn down — ignore.
    }
    recaptchaRef.current = null;
    // Firebase's clear() can leave residual grecaptcha markup in the container,
    // which makes a later render() throw "reCAPTCHA has already been rendered in
    // this element". Emptying the node guarantees a clean re-render.
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = "";
    }
  };

  const initializeRecaptcha = async () => {
    if (!recaptchaContainerRef.current) {
      throw new Error("reCAPTCHA container not ready. Please try again.");
    }

    // Firebase app-verification tokens are one-time use, so create a fresh
    // verifier for each OTP send/resend attempt.
    clearRecaptcha();

    // Render into a brand-new child element rather than the persistent
    // container. grecaptcha tracks the element it rendered into by reference, so
    // reusing the same node throws "reCAPTCHA has already been rendered in this
    // element" (e.g. after "Change mobile number"). A fresh node each time is
    // always clean.
    const host = document.createElement("div");
    recaptchaContainerRef.current.appendChild(host);

    recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, host, {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        setError("reCAPTCHA expired. Please try again.");
        clearRecaptcha();
      },
    });

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
    // Tear down the verifier so returning to the number entry (e.g. "Change
    // mobile number") can render a fresh reCAPTCHA on the next send.
    clearRecaptcha();
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

  const verifyOtp = async (code: string) => {
    if (!confirmationResult) {
      setError("Please request OTP first");
      return;
    }

    const trimmedCode = code.trim();
    if (trimmedCode.length < OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit code`);
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setLoading(true);

      await confirmationResult.confirm(trimmedCode);

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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyOtp(otp);
  };

  // Auto-fetch the SMS OTP (Android Chrome via WebOTP) while the OTP step is
  // showing. Fill the field and submit automatically once the full code arrives.
  useSmsOtpAutofill(
    Boolean(confirmationResult) && !loading,
    (code) => {
      setOtp(code);
      if (code.length >= OTP_LENGTH) {
        void verifyOtp(code);
      }
    },
    OTP_LENGTH,
  );

  const handleClose = () => {
    clearRecaptcha();
    setPhone("");
    setError("");
    setSuccessMessage("");
    resetOtpFlow();
    onClose();
  };

  // Shared input styling used by both the phone and OTP fields.
  const fieldSx = {
    mb: 2,
    "& .MuiOutlinedInput-root": {
      minHeight: 56,
      borderRadius: 2.5,
      bgcolor: "#fbfdff",
      fontWeight: 600,
      "& fieldset": { borderColor: "rgba(15,23,42,0.12)" },
      "&:hover fieldset": { borderColor: "rgba(15,23,42,0.25)" },
      "&.Mui-focused fieldset": { borderColor: brand.primary, borderWidth: 2 },
    },
    "& input::placeholder": { color: brand.slateMuted, opacity: 1 },
  } as const;

  const fieldLabelSx = {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    color: brand.slate,
    mb: 0.75,
  } as const;

  const primaryButtonSx = {
    minHeight: 52,
    px: 4,
    mt: 0.5,
    borderRadius: 2.5,
    bgcolor: brand.primary,
    boxShadow: "0 14px 30px rgba(13,110,253,0.28)",
    fontWeight: 800,
    fontSize: 16,
    textTransform: "none",
    "&:hover": {
      bgcolor: brand.primaryDark,
      boxShadow: "0 16px 32px rgba(13,110,253,0.32)",
    },
  } as const;

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
          background:
            `linear-gradient(135deg, ${brand.canvas} 0%, ${brand.primarySoft} 46%, ${brand.accentSoft} 100%)`,
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
              src="/favicon2.png"
              alt="Kinvia"
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.5,
                display: "block",
                boxShadow: "0 6px 16px rgba(15,23,42,0.16)",
                bgcolor: brand.surface,
              }}
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
            {confirmationResult ? "Verify your number" : "Welcome back"}
          </Typography>
          <Typography sx={{ mt: 1, color: brand.slate, fontSize: 15 }}>
            {confirmationResult
              ? `Enter the ${OTP_LENGTH}-digit code we just sent you.`
              : "Sign in securely to continue your family story."}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          p: { xs: 2.75, sm: 3.5 },
          bgcolor: brand.surface,
        }}
      >
        <Box mt={3}>
          {!confirmationResult && (
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              flexWrap="wrap"
              sx={{ mb: 3 }}
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

          {!confirmationResult ? (
            <form onSubmit={handleSendOtp}>
              <Typography component="label" sx={fieldLabelSx}>
                Mobile number
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                value={phone}
                onChange={(e) => {
                  const digitsOnly = e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10);
                  setPhone(digitsOnly);
                }}
                placeholder="Enter your mobile number"
                sx={fieldSx}
                disabled={loading}
                inputProps={{
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                  maxLength: 10,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography sx={{ fontWeight: 800, color: brand.ink }}>
                          +91
                        </Typography>
                        <Box
                          sx={{
                            width: "1px",
                            height: 22,
                            bgcolor: "rgba(15,23,42,0.18)",
                          }}
                        />
                      </Stack>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={primaryButtonSx}
              >
                {loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Send OTP"
                )}
              </Button>

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 2,
                  color: brand.slateMuted,
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                We use your phone number only to verify your Kinvia account access.
              </Typography>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <Typography sx={{ ...fieldLabelSx, mb: 1.25 }}>
                Enter the code sent to{" "}
                <Box component="span" sx={{ color: brand.ink, fontWeight: 800 }}>
                  +91 {phone}
                </Box>
              </Typography>

              <OtpInput
                length={OTP_LENGTH}
                value={otp}
                onChange={setOtp}
                disabled={loading}
                autoFocus
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading || otp.length < OTP_LENGTH}
                sx={{ ...primaryButtonSx, mt: 2.5 }}
              >
                {loading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  "Verify and continue"
                )}
              </Button>

              <Typography
                variant="body2"
                sx={{ mt: 1.75, textAlign: "center", color: brand.slateMuted }}
              >
                Didn't get a code?{" "}
                <Box
                  component="span"
                  role="button"
                  onClick={() => {
                    if (!loading && resendCooldownSeconds <= 0) {
                      void handleResendOtp();
                    }
                  }}
                  sx={{
                    fontWeight: 800,
                    color:
                      loading || resendCooldownSeconds > 0
                        ? brand.slateMuted
                        : brand.primary,
                    cursor:
                      loading || resendCooldownSeconds > 0
                        ? "default"
                        : "pointer",
                  }}
                >
                  {resendCooldownSeconds > 0
                    ? `Resend OTP in ${formatCooldown(resendCooldownSeconds)}`
                    : "Resend OTP"}
                </Box>
              </Typography>

              <Button
                variant="text"
                fullWidth
                onClick={() => {
                  resetOtpFlow();
                  setSuccessMessage("");
                  setError("");
                }}
                disabled={loading}
                sx={{
                  mt: 0.5,
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  color: brand.slate,
                }}
              >
                Change mobile number
              </Button>
            </form>
          )}

          <Box ref={recaptchaContainerRef} sx={{ mt: 1 }} />
        </Box>
      </DialogContent>
    </Dialog>
  );
};
