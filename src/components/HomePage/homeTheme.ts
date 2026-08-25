import { SxProps, Theme } from "@mui/material";
import { brand } from "../../theme/brand";

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

/** Warm heritage wash for the hero — deliberately not the blue used elsewhere. */
export const heroSurface = [
  `radial-gradient(circle at 8% 0%, rgba(13, 110, 253, 0.10) 0%, rgba(13, 110, 253, 0) 42%)`,
  `radial-gradient(circle at 92% 8%, rgba(22, 163, 74, 0.07) 0%, rgba(22, 163, 74, 0) 38%)`,
  `linear-gradient(160deg, ${brand.warmSoft} 0%, ${brand.warm} 55%, ${brand.surface} 100%)`,
].join(", ");

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
