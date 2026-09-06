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

  // Warm (cream) — heritage tones. Currently unused: the home hero moved to the
  // cool wash in homeTheme's `heroSurface`. Kept for warm surfaces elsewhere.
  warmSoft: "#fdfbf7",
  warm: "#f6efe3",
} as const;

/** Primary call-to-action gradient (blue). */
export const brandGradient = `linear-gradient(135deg, ${brand.primary} 0%, ${brand.primaryDark} 100%)`;

/**
 * The app's page wash — a vertical fall from a blue-tinted top to the near-white
 * the pages sit on.
 *
 * One gradient for every full-width surface that carries a page or section
 * header: the homepage hero, the families toolbar, the business, about and FAQ
 * headers. It used to be three near-identical washes plus a warm cream on the
 * homepage, which read as four different products stitched together.
 * Decorative gradients inside components (avatar tints, image scrims, button
 * fills) are a separate thing and keep their own colours.
 */
const WASH_TOP = "#eef5ff";
const WASH_MID = "#f5f9ff";
const WASH_BASE = "#f8faff";

export const pageGradient = `linear-gradient(to bottom, ${WASH_TOP} 0%, ${WASH_MID} 52%, ${WASH_BASE} 100%)`;

/**
 * The page wash plus two ambient glows — a large cool bloom off the top-right
 * and a fainter one at the left edge.
 *
 * Radial gradients rather than the blurred, absolutely-positioned circles the
 * design used: same effect, but it stays a single `background` value with no
 * extra elements to position, clip, or keep out of the accessibility tree.
 */
export const heroGradient = [
  `radial-gradient(600px circle at 88% -6%, rgba(147, 197, 253, 0.30) 0%, rgba(199, 210, 254, 0.18) 45%, rgba(199, 210, 254, 0) 72%)`,
  `radial-gradient(420px circle at 0% 38%, rgba(59, 130, 246, 0.10) 0%, rgba(59, 130, 246, 0) 70%)`,
  pageGradient,
].join(", ");

/**
 * Deep royal-to-navy ribbon for the closing call to action.
 *
 * The one dark surface on an otherwise pale page: after scrolling a full page of
 * white panels on a blue wash, a section that inverts is what makes the last ask
 * register as an ask. The two blooms (white off the top-right, sky off the
 * bottom-left) keep it from reading as a flat blue slab.
 */
export const ctaGradient = [
  `radial-gradient(420px circle at 92% -8%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 70%)`,
  `radial-gradient(360px circle at 8% 108%, rgba(125, 211, 252, 0.22) 0%, rgba(125, 211, 252, 0) 70%)`,
  `linear-gradient(to bottom right, #0f2868 0%, #1d4ed8 58%, #2563eb 100%)`,
].join(", ");

/** Hairline that closes a washed section. Blue-tinted, so it reads as the edge
 *  of the wash rather than a grey rule laid over it. */
export const washBorder = "rgba(219, 234, 254, 0.7)";

export default brand;
