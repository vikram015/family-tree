import React from "react";
import { Alert, AlertTitle, Button, Snackbar } from "@mui/material";
import { usePushNotifications } from "../hooks/usePushNotifications";

/**
 * Surfaces push notifications that arrive while the app is open.
 *
 * The service worker only handles notifications while the app is in the
 * background; FCM delivers foreground ones to the page instead, where they
 * would otherwise be silently dropped.
 */
export const PushNotificationToast: React.FC = () => {
  const { notification, dismissNotification, openNotification } = usePushNotifications();

  return (
    <Snackbar
      open={Boolean(notification)}
      autoHideDuration={8000}
      onClose={dismissNotification}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ left: { xs: 16 }, right: { xs: 16 } }}
    >
      <Alert
        severity="info"
        variant="filled"
        onClose={dismissNotification}
        action={
          <Button color="inherit" size="small" onClick={openNotification}>
            View
          </Button>
        }
        sx={{ width: "100%" }}
      >
        {notification?.title && <AlertTitle>{notification.title}</AlertTitle>}
        {notification?.body}
      </Alert>
    </Snackbar>
  );
};

export default PushNotificationToast;
