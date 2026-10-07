import React, { useEffect } from "react";
import { Alert, AlertTitle, Button, Snackbar } from "@mui/material";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { pushNotifications } from "../../services/pushNotifications";

/** Message the FCM worker posts when a notification is tapped while the app is open. */
const NOTIFICATION_CLICK_MESSAGE = "kinvia-notification-click";

function isMobileDevice(): boolean {
  const uaData = (navigator as any).userAgentData;
  if (typeof uaData?.mobile === "boolean") return uaData.mobile;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Surfaces push notifications that arrive while the app is open.
 *
 * The service worker only handles notifications while the app is in the
 * background; FCM delivers foreground ones to the page instead, where they
 * would otherwise be silently dropped.
 *
 * The toast stays until dismissed: a phone is often glanced at, not watched,
 * and an auto-hiding one was gone before anyone saw it. On mobile the message
 * also goes to the system tray, so it's still there after the app is left.
 *
 * Mounted once (in App), which is why the system notification is raised here
 * and not in the hook — every other hook instance gets the message too.
 *
 * Every way of opening a notification — "View" here, or a tap in the tray that
 * the FCM worker relays — goes through `onOpen`, which loads the target page
 * fresh even when it's the page already showing.
 */
export const PushNotificationToast: React.FC<{ onOpen: (path: string) => void }> = ({
  onOpen,
}) => {
  const { notification, dismissNotification } = usePushNotifications();

  useEffect(() => {
    if (!notification || !isMobileDevice()) return;
    void pushNotifications.showLocalNotification({
      title: notification.title,
      body: notification.body,
      clickPath: notification.clickPath,
      tag: notification.id,
    });
  }, [notification]);

  // A tap on any notification in the tray, relayed by the FCM worker.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== NOTIFICATION_CLICK_MESSAGE) return;
      dismissNotification();
      onOpen(String(event.data.path || "/requests"));
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [onOpen, dismissNotification]);

  return (
    <Snackbar
      open={Boolean(notification)}
      // Only the close button or "View" dismisses it — not a stray tap
      // elsewhere on the page.
      onClose={(_event, reason) => {
        if (reason !== "clickaway") dismissNotification();
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ left: { xs: 16 }, right: { xs: 16 } }}
    >
      <Alert
        severity="info"
        variant="filled"
        onClose={dismissNotification}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => {
              if (!notification) return;
              dismissNotification();
              onOpen(notification.clickPath);
            }}
          >
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
