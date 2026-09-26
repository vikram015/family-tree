import React from "react";
import { Box, Button, Link, Paper, Typography } from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";
import { useAuth } from "../hooks/useAuth";
import { brand } from "../../theme/brand";

interface BlockedScreenProps {
  reason?: string | null;
}

/**
 * Full-screen message shown instead of the application when the signed-in
 * user's account has been blocked by an administrator.
 */
export const BlockedScreen: React.FC<BlockedScreenProps> = ({ reason }) => {
  const { logout } = useAuth();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        bgcolor: brand.canvas,
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 440, textAlign: "center", borderRadius: 3 }}>
        <BlockIcon sx={{ fontSize: 56, color: "error.main", mb: 1.5 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Account blocked
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {"Your account has been blocked. Please contact us to resolve the issue."}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Need help? Contact us at{" "}
          <Link href="mailto:info@kinvia.in" underline="hover">
            info@kinvia.in
          </Link>
          .
        </Typography>
        <Button variant="contained" color="primary" onClick={() => void logout()}>
          Sign out
        </Button>
      </Paper>
    </Box>
  );
};
