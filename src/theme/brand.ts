/**
 * Application brand tokens — the single source of truth for Kinvia's palette.
 *
 * These values are derived from the onboarding experience (blue primary,
 * green success, slate neutrals) and are the canonical colors for the whole
 * app. Prefer the MUI theme (`color="primary"`, `theme.palette.*`) in
 * components; reach for these tokens only where a raw color value is needed
 * (gradients, custom tints) instead of hard-coding hex literals.
 */
export const brand = {
  // Primary (blue) — main brand / call-to-action
  primary: "#0d6efd",
  primaryDark: "#0b5ed7",
  primarySoft: "#eff6ff",

  // Accent (green) — success / positive states
  accent: "#16a34a",
  accentDark: "#15803d",
  accentSoft: "#dcfce7",

  // Neutrals
  ink: "#0f172a",
  slate: "#475569",
  slateMuted: "#64748b",
  border: "#e2e8f0",
  surface: "#ffffff",
  canvas: "#f8fafc",
} as const;

/** Primary call-to-action gradient (blue). */
export const brandGradient = `linear-gradient(135deg, ${brand.primary} 0%, ${brand.primaryDark} 100%)`;

export default brand;
