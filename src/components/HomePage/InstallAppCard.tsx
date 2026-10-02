import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InstallMobileOutlinedIcon from "@mui/icons-material/InstallMobileOutlined";
import IosShareIcon from "@mui/icons-material/IosShare";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import OpenInBrowserIcon from "@mui/icons-material/OpenInBrowser";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { brand } from "../../theme/brand";
import { panelSx } from "./homeTheme";
import { InstallPlatform, promptInstall, useInstallPrompt } from "../../utils/pwaInstall";

/**
 * "Install Kinvia" on the dashboard.
 *
 * Where the browser can install (Chrome/Edge), the button opens the real
 * install dialog. Where it cannot — every iOS browser, in-app browsers, some
 * Android browsers — the same button opens a short illustrated guide instead,
 * because on those platforms the steps are the only way in.
 *
 * Hidden once installed, and for a month after "Not now" so it is an offer
 * rather than a nag.
 */

const DISMISS_KEY = "kinvia.installCard.dismissedAt";
const DISMISS_DAYS = 30;

function wasDismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Boolean(at) && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Private mode / blocked storage: the card simply comes back next visit.
  }
}

type Step = { icon: React.ReactNode; title: React.ReactNode; detail?: string };

function isIPad(): boolean {
  const ua = navigator.userAgent || "";
  return /iPad/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
}

function isIOSChrome(): boolean {
  return /CriOS|EdgiOS|FxiOS/.test(navigator.userAgent || "");
}

function stepsFor(platform: InstallPlatform): { intro: string; steps: Step[] } {
  if (platform === "ios") {
    const shareWhere = isIOSChrome()
      ? "It's in the address bar, at the top right."
      : isIPad()
        ? "It's in the toolbar at the top of Safari."
        : "It's in the toolbar at the bottom of Safari. Scroll up a little if you can't see it.";
    return {
      intro: "iPhone and iPad install apps from the Share menu. It takes three taps.",
      steps: [
        {
          icon: <IosShareIcon />,
          title: (
            <>
              Tap the <b>Share</b> button
            </>
          ),
          detail: shareWhere,
        },
        {
          icon: <AddBoxOutlinedIcon />,
          title: (
            <>
              Choose <b>Add to Home Screen</b>
            </>
          ),
          detail: "Scroll down the list if you don't see it at first.",
        },
        {
          icon: <CheckCircleOutlineIcon />,
          title: (
            <>
              Tap <b>Add</b>
            </>
          ),
          detail: "Kinvia appears on your home screen and opens like an app.",
        },
      ],
    };
  }

  if (platform === "in-app") {
    return {
      intro:
        "You're viewing Kinvia inside another app, which can't install it. Open it in your browser first.",
      steps: [
        {
          icon: <MoreHorizIcon />,
          title: (
            <>
              Tap the <b>⋯</b> or <b>⋮</b> menu
            </>
          ),
          detail: "Usually at the top right of this screen.",
        },
        {
          icon: <OpenInBrowserIcon />,
          title: (
            <>
              Choose <b>Open in Safari</b> / <b>Open in browser</b>
            </>
          ),
          detail: "Or copy the link below and paste it into Safari or Chrome.",
        },
        {
          icon: <InstallMobileOutlinedIcon />,
          title: (
            <>
              Tap <b>Install Kinvia</b> again there
            </>
          ),
        },
      ],
    };
  }

  // Android (and anything else) without a browser install prompt.
  return {
    intro: "Install Kinvia from your browser's menu.",
    steps: [
      {
        icon: <MoreVertIcon />,
        title: (
          <>
            Open the browser menu <b>⋮</b>
          </>
        ),
        detail: "Top right in Chrome, bottom in Samsung Internet.",
      },
      {
        icon: <AddBoxOutlinedIcon />,
        title: (
          <>
            Tap <b>Install app</b> or <b>Add to Home screen</b>
          </>
        ),
      },
      {
        icon: <CheckCircleOutlineIcon />,
        title: (
          <>
            Confirm with <b>Install</b>
          </>
        ),
      },
    ],
  };
}

export const InstallAppCard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { standalone, canPrompt, platform } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(wasDismissedRecently);
  const [guideOpen, setGuideOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Only offer it where there is actually a way to install: a live browser
  // prompt, or a platform we can walk through by hand. Desktop Safari/Firefox
  // get nothing rather than instructions that don't apply.
  const installable = canPrompt || platform === "ios" || platform === "in-app" || platform === "android";
  if (standalone || dismissed || !installable) return null;

  const handleInstall = async () => {
    if (canPrompt) {
      await promptInstall();
      return;
    }
    setGuideOpen(true);
  };

  const handleDismiss = () => {
    rememberDismissal();
    setDismissed(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const guide = stepsFor(platform);

  return (
    <>
      <Box
        sx={{
          ...(panelSx as object),
          p: { xs: 1.75, sm: 2 },
          mt: { xs: 2, md: 2.5 },
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: brand.primarySoft,
            color: brand.primary,
          }}
        >
          <InstallMobileOutlinedIcon />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: brand.ink }}>
            Install Kinvia on your phone
          </Typography>
          <Typography variant="body2" sx={{ color: brand.slate }}>
            Open your family tree from the home screen, full screen, like any other app.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0, width: { xs: "100%", sm: "auto" } }}>
          <Button
            onClick={handleDismiss}
            color="inherit"
            sx={{ textTransform: "none", color: brand.slate, minHeight: 44 }}
          >
            Not now
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleInstall()}
            startIcon={<InstallMobileOutlinedIcon />}
            fullWidth={isMobile}
            sx={{
              fontWeight: 700,
              minHeight: 44,
              textTransform: "none",
              fontSize: 14,
              bgcolor: brand.primary,
              "&:hover": { bgcolor: brand.primaryDark },
            }}
          >
            Install app
          </Button>
        </Stack>
      </Box>

      <Dialog open={guideOpen} onClose={() => setGuideOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle component="div" sx={{ pr: 6 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 18, color: brand.ink }}>
            Install Kinvia
          </Typography>
          <Typography sx={{ fontSize: 13, color: brand.slateMuted, mt: 0.5 }}>
            {guide.intro}
          </Typography>
          <IconButton
            onClick={() => setGuideOpen(false)}
            aria-label="Close"
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack component="ol" spacing={2} sx={{ listStyle: "none", p: 0, m: 0 }}>
            {guide.steps.map((step, index) => (
              <Stack component="li" key={index} direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: brand.primarySoft,
                    color: brand.primary,
                    position: "relative",
                  }}
                >
                  {step.icon}
                  <Box
                    component="span"
                    sx={{
                      position: "absolute",
                      top: -6,
                      left: -6,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      bgcolor: brand.primary,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {index + 1}
                  </Box>
                </Box>
                <Box sx={{ minWidth: 0, pt: 0.25 }}>
                  <Typography sx={{ color: brand.ink, fontSize: 15 }}>{step.title}</Typography>
                  {step.detail && (
                    <Typography sx={{ color: brand.slateMuted, fontSize: 13, mt: 0.25 }}>
                      {step.detail}
                    </Typography>
                  )}
                </Box>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          {platform === "in-app" && (
            <Button
              onClick={() => void handleCopy()}
              startIcon={copied ? <CheckCircleOutlineIcon /> : <ContentCopyIcon />}
              sx={{ textTransform: "none", mr: "auto" }}
            >
              {copied ? "Link copied" : "Copy link"}
            </Button>
          )}
          <Button
            variant="contained"
            onClick={() => setGuideOpen(false)}
            sx={{ textTransform: "none", fontWeight: 700, bgcolor: brand.primary }}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InstallAppCard;
