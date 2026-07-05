import { createTheme } from "@mui/material/styles";
import { brand } from "./brand";

/**
 * The application MUI theme, derived from the brand tokens (which come from the
 * onboarding experience). This is the single place that maps brand colors onto
 * MUI's palette so `color="primary"`, `color="success"`, `text.secondary`, etc.
 * render consistent, on-brand colors everywhere — no per-component hex literals.
 */
export const theme = createTheme({
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
      default: brand.canvas,
      paper: brand.surface,
    },
    divider: brand.border,
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;
