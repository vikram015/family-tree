import { createTheme } from "@mui/material/styles";
import { brand, fontSans } from "./brand";

/**
 * The application MUI theme, derived from the brand tokens (which come from the
 * onboarding experience). This is the single place that maps brand colors onto
 * MUI's palette so `color="primary"`, `color="success"`, `text.secondary`, etc.
 * render consistent, on-brand colors everywhere — no per-component hex literals.
 */
export const theme = createTheme({
  // MUI defaults to Roboto, which the app never loads — so every MUI surface
  // was rendering in a system fallback while plain DOM text used the stack in
  // index.css. One family, set here, covers both.
  typography: { fontFamily: fontSans },
  palette: {
    primary: {
      main: brand.primary,
      dark: brand.primaryDark,
      light: brand.primarySoft,
      contrastText: "#ffffff",
    },
    secondary: {
      main: brand.accent,
      dark: brand.accentDark,
      light: brand.accentSoft,
      contrastText: "#ffffff",
    },
    success: {
      main: brand.accent,
      dark: brand.accentDark,
      light: brand.accentSoft,
      contrastText: "#ffffff",
    },
    text: {
      primary: brand.ink,
      secondary: brand.slateMuted,
    },
    background: {
      default: brand.pageCanvas,
      paper: brand.surface,
    },
    divider: brand.border,
  },
  shape: {
    borderRadius: 8,
  },
  // Every button is a pill. This is the one place that decides it — buttons
  // should not set their own borderRadius, which is how they drifted to a mix
  // of 8, 16, 20 and 24px.
  components: {
    MuiButton: {
      styleOverrides: { root: { borderRadius: 999 } },
    },
    // A toggle group keeps square inner corners between its buttons (MUI's
    // group styles zero them), so this rounds only the group's two ends.
    MuiToggleButton: {
      styleOverrides: { root: { borderRadius: 999 } },
    },
    // Bottom snackbars sit above the phone's tab bar rather than on it. The
    // variable is only set while the tab bar is showing, so elsewhere this is 0.
    MuiSnackbar: {
      styleOverrides: {
        root: {
          "&.MuiSnackbar-anchorOriginBottomCenter, &.MuiSnackbar-anchorOriginBottomLeft, &.MuiSnackbar-anchorOriginBottomRight":
            { marginBottom: "var(--kinvia-bottom-nav, 0px)" },
        },
      },
    },
  },
});

export default theme;
