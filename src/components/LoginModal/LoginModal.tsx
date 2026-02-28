import React, { useState } from "react";
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
import { useAuth } from "../hooks/useAuth";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { signInWithEmail, signUpWithEmail, sendPasswordResetEmail } =
    useAuth();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      return setError("Please enter your email");
    }

    try {
      setError("");
      setSuccessMessage("");
      setLoading(true);
      await sendPasswordResetEmail(email);
      setSuccessMessage("Password reset link sent! Please check your email.");
    } catch (err: any) {
      console.error("Reset request error:", err);
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      return setError("Please enter email and password");
    }

    try {
      setError("");
      setSuccessMessage("");
      setLoading(true);
      await signInWithEmail(email, password);

      // Clear form
      setEmail("");
      setPassword("");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Sign in error:", err);
      const errorMessage = typeof err === "string" ? err : err.message;

      if (
        errorMessage &&
        (errorMessage.includes("Email not confirmed") ||
          errorMessage.includes("Email link is invalid or has expired"))
      ) {
        setSuccessMessage(
          "Please check your email to verify your account before logging in.",
        );
        setError("");
      } else {
        setError(errorMessage || "Failed to sign in");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !name || !phone) {
      return setError(
        "Please fill in all fields (Email, Password, Name, Phone)",
      );
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    try {
      setError("");
      setSuccessMessage("");
      setLoading(true);
      const result = await signUpWithEmail(email, password, name, phone);

      if (!result.currentUser) {
        // User created but not logged in (Email verification needed)
        setSuccessMessage(
          "Account created successfully! Please check your email to verify your account before logging in.",
        );
        setIsSignUp(false); // Switch to Sign In view
        setEmail("");
        setPassword("");
        setName("");
        setPhone("");
      } else {
        // User created and logged in (Auto-login)
        setEmail("");
        setPassword("");
        setName("");
        setPhone("");
        setIsSignUp(false);
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      console.error("Sign up error:", err);
      const errorMessage = typeof err === "string" ? err : err.message;
      setError(errorMessage || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setPassword("");
    setName("");
    setPhone("");
    setError("");
    setSuccessMessage("");
    setIsSignUp(false);
    setIsForgotPassword(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {isForgotPassword
              ? "Reset Password"
              : isSignUp
                ? "Create Account"
                : "Sign In"}
          </Typography>
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

          <form
            onSubmit={
              isForgotPassword
                ? handleResetRequest
                : isSignUp
                  ? handleSignUp
                  : handleSignIn
            }
          >
            {/* Sign Up Fields */}
            {!isForgotPassword && isSignUp && (
              <>
                <TextField
                  label="Name"
                  fullWidth
                  required
                  variant="outlined"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  sx={{ mb: 2 }}
                  disabled={loading}
                />
                <TextField
                  label="Phone"
                  fullWidth
                  required
                  variant="outlined"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91..."
                  sx={{ mb: 2 }}
                  disabled={loading}
                />
              </>
            )}

            {/* Email Field - Always visible unless... well always visible */}
            <TextField
              label="Email"
              fullWidth
              variant="outlined"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              sx={{ mb: 2 }}
              disabled={loading}
              helperText={
                isForgotPassword
                  ? "We'll send you a link to reset your password."
                  : ""
              }
            />

            {/* Password Field - Hidden in Forgot Password mode */}
            {!isForgotPassword && (
              <TextField
                label="Password"
                fullWidth
                variant="outlined"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                helperText={isSignUp ? "Minimum 6 characters" : ""}
                sx={{ mb: 2 }}
                disabled={loading}
              />
            )}

            {/* Submit Button */}
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
                : isForgotPassword
                  ? "Send Reset Link"
                  : isSignUp
                    ? "Create Account"
                    : "Sign In"}
            </Button>

            {/* Forgot Password Link - Only in Sign In mode */}
            {!isForgotPassword && !isSignUp && (
              <Button
                variant="text"
                fullWidth
                size="small"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError("");
                  setSuccessMessage("");
                }}
                disabled={loading}
                sx={{ mb: 1 }}
              >
                Forgot Password?
              </Button>
            )}

            {/* Toggle Mode Button */}
            <Button
              variant="text"
              fullWidth
              onClick={() => {
                if (isForgotPassword) {
                  setIsForgotPassword(false);
                } else {
                  setIsSignUp(!isSignUp);
                }
                setError("");
                setSuccessMessage("");
              }}
              disabled={loading}
            >
              {isForgotPassword
                ? "Back to Sign In"
                : isSignUp
                  ? "Already have an account? Sign In"
                  : "Don't have an account? Sign Up"}
            </Button>
          </form>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
