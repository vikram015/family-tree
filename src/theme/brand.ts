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

  // Warm (cream) — heritage tones for soft, inviting surfaces (e.g. the home hero)
  warmSoft: "#fdfbf7",
  warm: "#f6efe3",
} as const;

/** Primary call-to-action gradient (blue). */
export const brandGradient = `linear-gradient(135deg, ${brand.primary} 0%, ${brand.primaryDark} 100%)`;

/**
 * Soft page-header gradient shared by content pages (Home, Business, About).
 * Uses the app theme's blue, green, and neutral surfaces for a subtle branded wash.
 */
export const pageGradient = [
  `radial-gradient(circle at 12% 18%, rgba(13, 110, 253, 0.16) 0%, rgba(13, 110, 253, 0) 34%)`,
  `radial-gradient(circle at 88% 12%, rgba(22, 163, 74, 0.06) 0%, rgba(22, 163, 74, 0) 30%)`,
  `linear-gradient(135deg, ${brand.surface} 0%, ${brand.primarySoft} 48%, ${brand.canvas} 76%, ${brand.surface} 100%)`,
].join(", ");

export default brand;
