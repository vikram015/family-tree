import React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Link } from "react-router-dom";
import { OtpInput } from "./OtpInput";
import { OTP_LENGTH } from "../../config/otp";
import { brand } from "../../theme/brand";
import { formatCountdown, PhoneOtpAuth } from "./usePhoneOtpAuth";

/**
 * The sign-in form itself — number, code, resend, submit.
 *
 * Shared by the full login page and the in-app modal so there is one
 * implementation of the two-step flow. `size` only changes proportions: "page"
 * gets the larger fields the design specifies, "modal" keeps the tighter ones
 * that fit a dialog.
 */

export interface PhoneOtpFormProps {
  auth: PhoneOtpAuth;
  size?: "page" | "modal";
}

export const PhoneOtpForm: React.FC<PhoneOtpFormProps> = ({ auth, size = "page" }) => {
  const isPage = size === "page";
  const phoneComplete = /^\d{10}$/.test(auth.phone);

  const fieldSx = {
    // Touch browsers paint a translucent black wash over the whole field on
    // tap, which reads as a flash/ripple inside the input. The focus ring is
    // the feedback here, so the default highlight is removed.
    WebkitTapHighlightColor: "transparent",
    "& .MuiOutlinedInput-root": {
      minHeight: isPage ? 60 : 56,
      borderRadius: 2.5,
      bgcolor: "#f7f9ff",
      fontWeight: 700,
      fontSize: isPage ? 20 : 16,
      letterSpacing: isPage ? "0.02em" : 0,
      "& fieldset": { borderColor: brand.border },
      "&:hover fieldset": { borderColor: "rgba(15,23,42,0.25)" },
      "&.Mui-focused": { bgcolor: brand.surface },
      "&.Mui-focused fieldset": { borderColor: brand.primary, borderWidth: 2 },
    },
    "& input::placeholder": { color: brand.slateMuted, opacity: 1, fontWeight: 500 },
  } as const;

  const labelSx = {
    fontSize: 14,
    fontWeight: 700,
    color: brand.ink,
    letterSpacing: "0.01em",
  } as const;

  const submitSx = {
    minHeight: isPage ? 56 : 52,
    borderRadius: 2.5,
    bgcolor: brand.primary,
    boxShadow: "0 14px 30px rgba(13,110,253,0.28)",
    fontWeight: 800,
    fontSize: isPage ? 17 : 16,
    textTransform: "none",
    "&:hover": {
      bgcolor: brand.primaryDark,
      boxShadow: "0 16px 32px rgba(13,110,253,0.32)",
      transform: "translateY(-1px)",
    },
    "&:active": { transform: "translateY(0)" },
    transition: "transform 140ms ease, box-shadow 140ms ease",
  } as const;

  return (
    <Box>
      {auth.successMessage && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {auth.successMessage}
        </Alert>
      )}
      {auth.error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {auth.error}
        </Alert>
      )}

      <form onSubmit={auth.awaitingCode ? auth.handleVerifyOtp : auth.handleSendOtp}>
        {/* ---- Mobile number ------------------------------------------------ */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 0.75, minHeight: 28 }}
        >
          <Typography component="label" htmlFor="login-phone" sx={labelSx}>
            Mobile number
          </Typography>
          {/* Only meaningful once a code is out: before that, the field itself
              is already editable. */}
          {auth.awaitingCode && (
            <Button
              type="button"
              onClick={auth.changeNumber}
              disabled={auth.loading}
              startIcon={<EditOutlinedIcon sx={{ fontSize: 15 }} />}
              sx={{
                p: 0,
                minWidth: 0,
                fontSize: 13,
                fontWeight: 700,
                textTransform: "none",
                color: brand.primary,
                "&:hover": { background: "none", textDecoration: "underline" },
              }}
            >
              Change
            </Button>
          )}
        </Stack>

        <TextField
          id="login-phone"
          fullWidth
          variant="outlined"
          value={auth.phone}
          onChange={(e) => auth.setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="00000 00000"
          sx={fieldSx}
          disabled={auth.loading}
          inputProps={{
            inputMode: "numeric",
            pattern: "[0-9]*",
            maxLength: 10,
            autoComplete: "tel-national",
            // Locked while a code is outstanding — editing it here would verify
            // the code against a number it was never sent to. `readOnly` rather
            // than `disabled` so the number the code went to stays legible;
            // "Change" above is the way back.
            readOnly: auth.awaitingCode,
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Stack direction="row" spacing={1} alignItems="center">
                  {/* Kinvia sends OTPs to Indian numbers only, so the country is
                      shown rather than offered as a choice that would fail. */}
                  <Typography sx={{ fontSize: 16 }} aria-hidden>
                    🇮🇳
                  </Typography>
                  <Typography sx={{ fontWeight: 800, color: brand.ink, fontSize: 16 }}>
                    +91
                  </Typography>
                  <Box sx={{ width: "1px", height: 22, bgcolor: brand.border }} />
                </Stack>
              </InputAdornment>
            ),
            endAdornment: phoneComplete ? (
              <InputAdornment position="end">
                <CheckCircleIcon sx={{ fontSize: 20, color: brand.accent }} />
              </InputAdornment>
            ) : undefined,
          }}
        />

        {/* ---- Verification code ------------------------------------------- */}
        {auth.awaitingCode && (
          <Box sx={{ mt: isPage ? 3 : 2.5 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              spacing={0.5}
              sx={{ mb: 1.25 }}
            >
              <Typography sx={labelSx}>{OTP_LENGTH}-digit security code</Typography>
              <Typography sx={{ fontSize: 12, color: brand.slateMuted }}>
                SMS sent to +91 {auth.phone}
              </Typography>
            </Stack>

            <OtpInput
              length={OTP_LENGTH}
              value={auth.otp}
              onChange={auth.setOtp}
              disabled={auth.loading}
              autoFocus
              size={isPage ? "large" : "medium"}
            />

            {/* ---- Resend --------------------------------------------------- */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
              spacing={1}
              sx={{ mt: 1.75 }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <TimerOutlinedIcon sx={{ fontSize: 17, color: brand.slateMuted }} />
                <Typography sx={{ fontSize: 13, color: brand.slateMuted }}>
                  {auth.resendCooldownSeconds > 0 ? (
                    <>
                      Didn&apos;t receive the code? Resend in{" "}
                      <Box
                        component="strong"
                        sx={{ color: brand.ink, fontVariantNumeric: "tabular-nums" }}
                      >
                        {formatCountdown(auth.resendCooldownSeconds)}
                      </Box>
                    </>
                  ) : (
                    "Didn't receive the code?"
                  )}
                </Typography>
              </Stack>

              <Button
                type="button"
                onClick={() => void auth.handleResendOtp()}
                disabled={auth.loading || auth.resendCooldownSeconds > 0}
                sx={{
                  p: 0,
                  minWidth: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: "none",
                  color: brand.primary,
                  "&.Mui-disabled": { color: brand.slateMuted, opacity: 0.6 },
                  "&:hover": { background: "none", textDecoration: "underline" },
                }}
              >
                Resend SMS
              </Button>
            </Stack>
          </Box>
        )}

        {/* ---- Submit ------------------------------------------------------- */}
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={
            auth.loading || (auth.awaitingCode && auth.otp.length < OTP_LENGTH)
          }
          startIcon={
            !auth.loading && auth.awaitingCode ? (
              <LockOpenIcon sx={{ fontSize: 20 }} />
            ) : undefined
          }
          sx={{ ...submitSx, mt: isPage ? 3 : 2.5 }}
        >
          {auth.loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : auth.awaitingCode ? (
            "Verify and log in"
          ) : (
            "Send code"
          )}
        </Button>
      </form>

      <Typography
        sx={{
          mt: 2.5,
          textAlign: "center",
          fontSize: 11.5,
          lineHeight: 1.6,
          color: brand.slateMuted,
        }}
      >
        We use your number only to verify your Kinvia account. By continuing you
        agree to our{" "}
        <Box
          component={Link}
          to="/terms"
          sx={{ color: brand.slate, textDecoration: "underline" }}
        >
          terms
        </Box>{" "}
        and{" "}
        <Box
          component={Link}
          to="/privacy-policy"
          sx={{ color: brand.slate, textDecoration: "underline" }}
        >
          privacy policy
        </Box>
        .
      </Typography>

      {/* Firebase renders the invisible reCAPTCHA into this node. */}
      <Box ref={auth.recaptchaContainerRef} sx={{ mt: 1 }} />
    </Box>
  );
};

export default PhoneOtpForm;
