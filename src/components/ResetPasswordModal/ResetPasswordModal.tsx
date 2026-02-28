import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
} from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { useAppDispatch } from "../../store/hooks";
import { setResetPasswordMode } from "../../store/slices/authSlice";

export const ResetPasswordModal: React.FC = () => {
  const { resetPasswordMode, updatePassword } = useAuth();
  const dispatch = useAppDispatch();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => {
        dispatch(setResetPasswordMode(false));
        // Optional: Redirect to login or home
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (success) {
      dispatch(setResetPasswordMode(false));
    }
    // If not successful, we force the user to complete it or they can close the tab
    // Or we allow them to close it and they stay logged in?
    dispatch(setResetPasswordMode(false));
  };

  return (
    <Dialog
      open={resetPasswordMode}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Reset Password</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {success ? (
            <Alert severity="success">
              Password updated successfully! Closing...
            </Alert>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Typography variant="body2" sx={{ mb: 2 }}>
                Please enter your new password.
              </Typography>
              <TextField
                label="New Password"
                type="password"
                fullWidth
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Confirm Password"
                type="password"
                fullWidth
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
