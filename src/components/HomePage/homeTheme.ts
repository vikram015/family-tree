import { SxProps, Theme } from "@mui/material";
import { brand, heroGradient } from "../../theme/brand";

/**
 * Shared visual language for the homepage sections.
 *
 * The old page rendered every block as an identical white MUI Card, which left
 * the eye nowhere to land. These tokens exist so each section can carry a
 * deliberate weight — a warm hero, photographic event cards, an unboxed
 * worklist, a thin stat bar, a tile grid — while still reading as one system.
 *
 * Every token is mobile-first: sizes and paddings step up at `sm`/`md` rather
 * than shrinking down, and nothing assumes a hover-capable pointer.
 */

/**
 * The hero's ground: the shared page wash plus its ambient glows.
 *
 * It was a warm cream, deliberately unlike the rest of the app; that fought the
 * blue chart and blue CTAs sitting on it, and made the homepage look like a
 * different product from the pages it links to. Aliased rather than redefined so
 * there is exactly one place to change it.
 */
export const heroSurface = heroGradient;

/**
 * Section eyebrow as a pill: a blue dot, then the label, inside a tinted
 * capsule. Used on the marketing page, where each section needs a visible
 * opening marker; the plainer `eyebrowSx` stays for the dashboard, where a
 * pill on every small heading would be noise.
 *
 * The dot is a `::before` rather than an element so the whole thing stays a
 * style token and call sites remain one `<Typography>`.
 */
export const eyebrowPillSx: SxProps<Theme> = {
  display: "inline-flex",
  alignItems: "center",
  gap: 0.75,
  px: 1.5,
  py: 0.5,
  borderRadius: 999,
  bgcolor: brand.primarySoft,
  border: "1px solid",
  borderColor: "rgba(191, 219, 254, 0.8)",
  color: brand.primary,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  "&::before": {
    content: '""',
    width: 6,
    height: 6,
    borderRadius: "50%",
    backgroundColor: brand.primary,
  },
};

/** Small uppercase label that opens a section — replaces the old h6-in-a-card. */
export const eyebrowSx: SxProps<Theme> = {
  textTransform: "uppercase",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.09em",
  color: brand.slateMuted,
};

/** Section heading sitting under an eyebrow. */
export const sectionTitleSx: SxProps<Theme> = {
  fontWeight: 800,
  fontSize: { xs: 19, sm: 22 },
  color: brand.ink,
  lineHeight: 1.25,
};

/** The standard raised surface. Softer and flatter than the MUI default so
 *  the hero and event cards can out-weigh it. */
export const panelSx: SxProps<Theme> = {
  borderRadius: 3,
  border: "1px solid",
  borderColor: brand.border,
  bgcolor: brand.surface,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

/** Interactive surface — a tile or row that navigates somewhere. */
export const tileSx: SxProps<Theme> = {
  ...(panelSx as object),
  transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
  "@media (hover: hover)": {
    "&:hover": {
      transform: "translateY(-2px)",
      borderColor: brand.primary,
      boxShadow: "0 6px 20px rgba(15, 23, 42, 0.10)",
    },
  },
  "&:active": { transform: "translateY(0)" },
};

/**
 * Horizontal scroll strip for mobile that becomes a grid on desktop.
 *
 * On phones a row of face cards should swipe rather than stack into a tall
 * column; from `md` up there's room to lay them out properly. Scrollbar is
 * hidden but the strip keeps snap points so it never lands mid-card.
 */
export const scrollStripSx: SxProps<Theme> = {
  display: "grid",
  gridAutoFlow: { xs: "column", md: "row" },
  // 248px is the narrowest an EventCard renders without truncating a two-word
  // name and its subtitle — below that "Asha Sharma" clips to "Asha S…".
  gridAutoColumns: { xs: "minmax(248px, 82%)", sm: "minmax(248px, 44%)" },
  gridTemplateColumns: { md: "repeat(auto-fill, minmax(220px, 1fr))" },
  gap: { xs: 1.25, md: 2 },
  overflowX: { xs: "auto", md: "visible" },
  scrollSnapType: { xs: "x mandatory", md: "none" },
  // Bleed to the container edge on mobile so cards don't look clipped.
  mx: { xs: -2, md: 0 },
  px: { xs: 2, md: 0 },
  pb: { xs: 1, md: 0 },
  "& > *": { scrollSnapAlign: "start" },
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
};

/** Page section rhythm — generous on desktop, tight on phones. */
export const sectionSpacing = { xs: 4, md: 6 } as const;

/** Avatar tint for a person with no photo, keyed off their name so the same
 *  person keeps the same color across the page. */
export function avatarTint(seed: string): { bg: string; fg: string } {
  const palette = [
    { bg: "#e0f2fe", fg: "#0369a1" },
    { bg: "#dcfce7", fg: "#15803d" },
    { bg: "#fef3c7", fg: "#b45309" },
    { bg: "#ede9fe", fg: "#6d28d9" },
    { bg: "#ffe4e6", fg: "#be123c" },
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

/** Initials for an avatar fallback, at most two letters. */
export function initialsOf(name: string): string {
  return (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/**
 * Accent tones for stat cards and tile icons.
 *
 * The brand palette has one blue and one green; the dashboard's metric row
 * needs four visually distinct icon wells so the cards read as four different
 * things at a glance rather than one repeated card. `attention` is the only
 * tone with meaning attached — it marks work waiting on the user and is the
 * single warm surface on the page.
 */
export const tone = {
  primary: { well: "#eff6ff", icon: "#1d4ed8" },
  indigo: { well: "#eef2ff", icon: "#4338ca" },
  emerald: { well: "#ecfdf5", icon: "#047857" },
  attention: {
    well: "#fef3c7",
    icon: "#92400e",
    surface: "#fffbeb",
    border: "#fde68a",
    borderStrong: "#fcd34d",
    ink: "#451a03",
    text: "#78350f",
    chip: "rgba(252, 211, 77, 0.5)",
  },
} as const;

/**
 * The gold ground for the day's events, straight from the design.
 *
 * Warm ivory into amber — the one non-blue surface on the dashboard, so a
 * remembrance is not announced in the same colour as a call to action.
 */
export const memorialSurface =
  "linear-gradient(135deg, #fdfbf7 0%, #fff7eb 50%, #fef3c7 100%)";

export type ToneName = "primary" | "indigo" | "emerald" | "attention";

/**
 * The rounded tinted square that holds a section or card icon.
 *
 * Used at 32px inside stat cards and 44px on the Explore tiles — one shape,
 * two sizes, so an icon always sits on a surface instead of floating.
 */
export const iconWellSx = (name: ToneName, size = 32): SxProps<Theme> => ({
  width: size,
  height: size,
  borderRadius: size >= 40 ? 2.5 : 2,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  bgcolor: tone[name].well,
  color: tone[name].icon,
  "& .MuiSvgIcon-root": { fontSize: size >= 40 ? 22 : 18 },
});

/**
 * A metric card: icon well and micro-label on the top row, the figure beneath,
 * and a two-part footer that splits the label from a secondary note.
 *
 * `attention` swaps the white surface for the warm one so the outstanding-work
 * card carries its own weight without needing a bigger number.
 */
export const statCardSx = (attention = false): SxProps<Theme> => ({
  ...(panelSx as object),
  p: { xs: 2, sm: 2.5 },
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  minHeight: { xs: 108, sm: 124 },
  textDecoration: "none",
  color: "inherit",
  transition: "border-color 140ms ease, box-shadow 140ms ease",
  ...(attention
    ? { bgcolor: tone.attention.surface, borderColor: tone.attention.border }
    : {}),
  "@media (hover: hover)": {
    "&:hover": {
      borderColor: attention ? tone.attention.borderStrong : "#cbd5e1",
      boxShadow: "0 4px 14px rgba(15, 23, 42, 0.06)",
    },
  },
});

/** Uppercase micro-label sitting opposite an icon well inside a card. */
export const microLabelSx: SxProps<Theme> = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: brand.slateMuted,
};

/** The figure in a metric card. */
export const statValueSx: SxProps<Theme> = {
  fontSize: { xs: 26, sm: 30 },
  fontWeight: 800,
  letterSpacing: "-0.02em",
  lineHeight: 1.1,
  color: brand.ink,
};

/**
 * A white card holding hairline-divided rows — the shape used by both the
 * worklist and the contributor ranking.
 *
 * The two lists used to sit unboxed directly on the page wash, which left a
 * long dashboard with no structure between the metric row and the footer.
 * `overflow: hidden` keeps the first and last row's hover fill inside the
 * rounded corners.
 */
export const listPanelSx: SxProps<Theme> = {
  ...(panelSx as object),
  overflow: "hidden",
  // Lighter than `brand.border`: an interior rule between rows should be
  // quieter than the card's own outline, or the card reads as a table.
  "& > *:not(:last-child)": { borderBottom: "1px solid #f1f5f9" },
};

/** One row inside `listPanelSx`. */
export const listRowSx: SxProps<Theme> = {
  display: "flex",
  alignItems: "center",
  gap: { xs: 1.25, sm: 1.75 },
  width: "100%",
  px: { xs: 2, sm: 3 },
  py: { xs: 1.5, sm: 1.75 },
  minHeight: 68,
  textAlign: "left",
  transition: "background-color 140ms ease",
};
