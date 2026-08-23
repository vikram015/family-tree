import React from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import NotificationsOffOutlinedIcon from "@mui/icons-material/NotificationsOffOutlined";
import { usePushNotifications } from "../hooks/usePushNotifications";

/**
 * Opt-in surface for web push.
 *
 * The permission prompt is deliberately behind a button rather than fired on
 * page load: browsers penalise unprompted permission requests, and a denial is
 * effectively permanent (the user must dig into site settings to undo it).
 */
export const NotificationSettingsCard: React.FC = () => {
  const { permission, enabling, enable, isEnabled, isUnsupported } =
    usePushNotifications();

  const isDenied = permission === "denied";

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        {isEnabled ? (
          <NotificationsActiveOutlinedIcon color="primary" />
        ) : (
          <NotificationsOffOutlinedIcon color="action" />
        )}
        <Typography variant="h6">Notifications</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Get alerted when someone requests access to your tree, and when your own
        requests are approved or declined.
      </Typography>

      <Divider sx={{ my: 2 }} />

      {isUnsupported ? (
        <Alert severity="info">
          This browser doesn’t support push notifications. On iPhone, add Kinvia
          to your Home Screen first — Safari only allows notifications for
          installed apps.
        </Alert>
      ) : isDenied ? (
        <Alert severity="warning">
          Notifications are blocked for this site. To turn them on, allow
          notifications for Kinvia in your browser’s site settings, then reload
          this page.
        </Alert>
      ) : isEnabled ? (
        <Alert severity="success">
          Notifications are on for this device.
        </Alert>
      ) : (
        <Box>
          <Button
            variant="contained"
            onClick={() => void enable()}
            disabled={enabling}
            startIcon={<NotificationsActiveOutlinedIcon />}
          >
            {enabling ? "Enabling…" : "Enable notifications"}
          </Button>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            Your browser will ask for permission. You can turn this off any time
            from your browser’s site settings.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default NotificationSettingsCard;
