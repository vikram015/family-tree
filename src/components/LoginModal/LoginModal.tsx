import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";

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
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { signInWithPhone, verifyOtp } = useAuth();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber || phoneNumber.length < 10) {
      return setError("Please enter a valid phone number");
    }

    try {
      setError("");
      setLoading(true);

      // Format phone number with country code if not present
      const formattedPhone = phoneNumber.startsWith("+")
        ? phoneNumber
        : `+91${phoneNumber}`;

      await signInWithPhone(formattedPhone);

      setOtpSent(true);
      setError("");
    } catch (err: any) {
      console.error("OTP send error:", err);
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      return setError("Please enter a valid 6-digit OTP");
    }

    try {
      setError("");
      setLoading(true);

      await verifyOtp(otp);

      // Clear form
      setPhoneNumber("");
      setOtp("");
      setOtpSent(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPhoneNumber("");
    setOtp("");
    setError("");
    setOtpSent(false);
    onClose();
  };

  const handleResendOtp = async () => {
    setOtpSent(false);
    setOtp("");
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
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!otpSent ? (
            <form onSubmit={handleSendOtp}>
              <TextField
                label="Phone Number"
                fullWidth
                variant="outlined"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="10-digit mobile number"
                helperText="Enter your 10-digit mobile number (without +91)"
                sx={{ mb: 2 }}
                disabled={loading}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>

              <Typography
                variant="caption"
                display="block"
                sx={{ mt: 2, textAlign: "center", color: "text.secondary" }}
              >
                You will receive a 6-digit OTP on your mobile number
              </Typography>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <Alert severity="info" sx={{ mb: 2 }}>
                OTP sent to {phoneNumber}
              </Alert>

              <TextField
                label="Enter OTP"
                fullWidth
                variant="outlined"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="6-digit OTP"
                helperText="Enter the 6-digit OTP sent to your phone"
                sx={{ mb: 2 }}
                disabled={loading}
                inputProps={{
                  maxLength: 6,
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ mb: 1 }}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>

              <Button
                variant="text"
                fullWidth
                onClick={handleResendOtp}
                disabled={loading}
              >
                Resend OTP
              </Button>
            </form>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
