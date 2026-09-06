import React from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { keyframes } from "@emotion/react";
import { Link } from "react-router-dom";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import LocationCityOutlinedIcon from "@mui/icons-material/LocationCityOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";

import { AnimatedCounter } from "../common/AnimatedCounter";
import { brand, ctaGradient, washBorder } from "../../theme/brand";
import {
  eyebrowPillSx,
  heroSurface,
  sectionSpacing,
  sectionTitleSx,
  tileSx,
} from "./homeTheme";

export interface LandingPageProps {
  /** Global people/business search, rendered by the caller. */
  searchSlot?: React.ReactNode;
  totalPeople: number;
  totalTrees: number;
  totalLocations: number;
  totalBusinesses: number;
  statsLoading?: boolean;
}

/** Minimum height that keeps every CTA a comfortable thumb target on phones. */
const TOUCH_TARGET = 48;

/**
 * Decorative pedigree chart for the hero.
 *
 * Inline rather than an asset so it stays crisp at any width and can animate;
 * purely ornamental, hence `aria-hidden` and no pointer interaction. The viewBox
 * does all the scaling work — the element itself is never given a pixel width.
 *
 * The names and dates are sample data, deliberately specific: a chart of empty
 * circles says "diagram", while one carrying a name, a year and a hometown says
 * "this is what your family looks like in here".
 */

/** Flowing dashes along the lineage stems — the "live" connections. */
const dashFlow = keyframes`
  to { stroke-dashoffset: -28; }
`;

/** Slow expanding ring behind the root and the active branch. */
const pulseRing = keyframes`
  0%   { transform: scale(0.86); opacity: 0.65; }
  70%  { transform: scale(1.3); opacity: 0; }
  100% { transform: scale(1.3); opacity: 0; }
`;

const HeroTreeGraphic: React.FC = () => {
  // Gradient, clip and filter are referenced by id, which is global to the
  // document — two copies of this graphic on one page would otherwise collide.
  // Colons from useId are stripped: legal in an id, but they make the value
  // unusable from a CSS selector.
  const uid = React.useId().replace(/:/g, "");
  const clipId = `${uid}-portrait`;
  const stemId = `${uid}-stem`;
  const glowId = `${uid}-glow`;

  return (
    <Box
      component="svg"
      viewBox="0 0 460 410"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      sx={{
        display: "block",
        width: "100%",
        maxWidth: 460,
        height: "auto",
        mx: "auto",
        userSelect: "none",
        // Text inherits the app's typeface rather than naming one the page may
        // not have loaded.
        fontFamily: "inherit",
        ".pedigree-line-flow": {
          strokeDasharray: "6 8",
          animation: `${dashFlow} 1.4s linear infinite`,
        },
        ".pulse-ring": {
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: `${pulseRing} 3.2s ease-out infinite`,
        },
        // Movement in the corner of the eye is a problem for some people; the
        // chart reads perfectly well standing still.
        "@media (prefers-reduced-motion: reduce)": {
          ".pedigree-line-flow": { strokeDasharray: "none", animation: "none" },
          ".pulse-ring": { animation: "none", opacity: 0.35 },
        },
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="0" cy="0" r="31" />
        </clipPath>
        <linearGradient id={stemId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.7" />
        </linearGradient>
        <filter id={glowId} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#1d4ed8" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* Generation 1 -> 2 */}
      <path d="M175 88 H285" stroke="#93c5fd" strokeLinecap="round" strokeWidth="2.5" />
      <path
        className="pedigree-line-flow"
        d="M230 88 V140"
        stroke={`url(#${stemId})`}
        strokeLinecap="round"
        strokeWidth="2.5"
      />
      <path d="M105 140 H355" stroke="#bfdbfe" strokeLinecap="round" strokeWidth="2.5" />

      {/* Generation 2 -> 3 */}
      <path className="pedigree-line-flow" d="M105 140 V205" stroke="#2563eb" strokeLinecap="round" strokeWidth="2.5" />
      <path className="pedigree-line-flow" d="M230 140 V205" stroke="#1d4ed8" strokeLinecap="round" strokeWidth="2.5" />
      <path className="pedigree-line-flow" d="M355 140 V205" stroke="#38bdf8" strokeLinecap="round" strokeWidth="2.5" />

      {/* Feeders into the youngest generation */}
      <path d="M105 238 V275" stroke="#bfdbfe" strokeLinecap="round" strokeWidth="2" />
      <path d="M65 275 H145" stroke="#bfdbfe" strokeLinecap="round" strokeWidth="2" />
      <path className="pedigree-line-flow" d="M65 275 V315" stroke="#93c5fd" strokeLinecap="round" strokeWidth="2" />
      <path className="pedigree-line-flow" d="M145 275 V315" stroke="#93c5fd" strokeLinecap="round" strokeWidth="2" />

      <path className="pedigree-line-flow" d="M230 240 V315" stroke="#2563eb" strokeLinecap="round" strokeWidth="2.2" />

      <path d="M355 238 V275" stroke="#bfdbfe" strokeLinecap="round" strokeWidth="2" />
      <path d="M310 275 H400" stroke="#bfdbfe" strokeLinecap="round" strokeWidth="2" />
      <path className="pedigree-line-flow" d="M310 275 V315" stroke="#93c5fd" strokeLinecap="round" strokeWidth="2" />
      <path className="pedigree-line-flow" d="M400 275 V315" stroke="#93c5fd" strokeLinecap="round" strokeWidth="2" />

      {/* ---------------------------------------------------- Generation 1 */}
      {/* Root ancestor, haloed and pulsing so the eye starts here. */}
      <g transform="translate(175, 85)">
        <circle className="pulse-ring" cx="0" cy="0" r="34" fill="none" stroke="#2563eb" strokeWidth="1.8" opacity="0.6" />
        <circle
          className="pulse-ring"
          cx="0"
          cy="0"
          r="32"
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.5"
          style={{ animationDelay: "1.4s" }}
        />
        <circle cx="0" cy="0" r="35" fill="#FFFFFF" filter={`url(#${glowId})`} />
        <circle cx="0" cy="0" r="33" stroke="#1d4ed8" strokeWidth="3.5" fill="#ffffff" />

        {/* Portrait: drawn, not fetched. A remote photo would be someone real,
            an extra request on first paint, and a dead link the day the host
            expires it. */}
        <g clipPath={`url(#${clipId})`}>
          <circle cx="0" cy="0" r="31" fill="#dbeafe" />
          <circle cx="0" cy="-7" r="11" fill="#60a5fa" />
          <ellipse cx="0" cy="26" rx="19" ry="15" fill="#60a5fa" />
        </g>

        {/* Verified badge */}
        <circle cx="22" cy="-20" fill="#1d4ed8" r="8.5" stroke="#ffffff" strokeWidth="2" />
        <path
          d="M19 -20 L21 -18 L25.5 -22.5"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />

        <g transform="translate(0, 44)">
          <rect x="-46" y="-8" width="92" height="18" rx="9" fill="#ffffff" stroke="#bfdbfe" strokeWidth="1" />
          <text x="0" y="4.5" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="800">
            Nikolaos • 1918
          </text>
        </g>
      </g>

      {/* Spouse */}
      <g transform="translate(285, 85)">
        <circle cx="0" cy="0" r="26" fill="#FFFFFF" stroke="#2563eb" strokeWidth="3" filter={`url(#${glowId})`} />
        <circle cx="0" cy="0" r="20" fill="#dbeafe" />
        <text x="0" y="5" textAnchor="middle" fill="#1e3a8a" fontSize="12" fontWeight="800">
          MR
        </text>
        <g transform="translate(0, 36)">
          <rect x="-38" y="-7" width="76" height="16" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <text x="0" y="4" textAnchor="middle" fill="#475569" fontSize="8.5" fontWeight="700">
            Athens • 1922
          </text>
        </g>
      </g>

      {/* ---------------------------------------------------- Generation 2 */}
      <g transform="translate(105, 205)">
        <circle cx="0" cy="0" r="24" fill="#FFFFFF" stroke="#2563eb" strokeWidth="3" />
        <circle cx="0" cy="0" r="17" fill="#eff6ff" />
        <text x="0" y="4.5" textAnchor="middle" fill="#1d4ed8" fontSize="11" fontWeight="800">
          AR
        </text>
        {/* Has-photos badge. The mock had an audio-memoir wave here; this app
            stores photos, not recordings, so the badge says photos. */}
        <circle cx="16" cy="-16" fill="#0284c7" r="7" stroke="#ffffff" strokeWidth="1.8" />
        <rect x="12.6" y="-18.6" width="6.8" height="5.2" rx="1.2" fill="none" stroke="#ffffff" strokeWidth="1.2" />
        <circle cx="16" cy="-16" r="1.5" fill="#ffffff" />
        <g transform="translate(0, 34)">
          <rect x="-40" y="-7" width="80" height="16" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <text x="0" y="4" textAnchor="middle" fill="#475569" fontSize="8.5" fontWeight="600">
            b. 1947 • Piraeus
          </text>
        </g>
      </g>

      {/* The branch being worked on */}
      <g transform="translate(230, 205)">
        <circle
          className="pulse-ring"
          cx="0"
          cy="0"
          r="28"
          fill="none"
          stroke="#1d4ed8"
          strokeWidth="1.5"
          opacity="0.5"
          style={{ animationDelay: "0.7s" }}
        />
        <circle cx="0" cy="0" r="27" fill="#FFFFFF" stroke="#1d4ed8" strokeWidth="3.5" />
        <circle cx="0" cy="0" r="19" fill="#dbeafe" />
        <text x="0" y="5" textAnchor="middle" fill="#1e3a8a" fontSize="12" fontWeight="800">
          VN
        </text>
        <g transform="translate(0, 36)">
          <rect x="-45" y="-7" width="90" height="16" rx="8" fill="#ffffff" stroke="#bfdbfe" strokeWidth="1" />
          <text x="0" y="4" textAnchor="middle" fill="#1d4ed8" fontSize="8.5" fontWeight="700">
            m. 1951 • Melbourne
          </text>
        </g>
      </g>

      <g transform="translate(355, 205)">
        <circle cx="0" cy="0" r="24" fill="#FFFFFF" stroke="#38bdf8" strokeWidth="3" />
        <circle cx="0" cy="0" r="17" fill="#f0f9ff" />
        <text x="0" y="4.5" textAnchor="middle" fill="#0284c7" fontSize="11" fontWeight="800">
          CL
        </text>
        <g transform="translate(0, 34)">
          <rect x="-38" y="-7" width="76" height="16" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
          <text x="0" y="4" textAnchor="middle" fill="#475569" fontSize="8.5" fontWeight="600">
            b. 1956 • Sydney
          </text>
        </g>
      </g>

      {/* ------------------------------------- Generation 3, the living base */}
      <g transform="translate(65, 320)">
        <circle cx="0" cy="0" r="16" fill="#FFFFFF" stroke="#3b82f6" strokeWidth="2.5" />
        <circle cx="0" cy="0" r="10" fill="#f0f7ff" />
      </g>
      <g transform="translate(145, 320)">
        <circle cx="0" cy="0" r="16" fill="#FFFFFF" stroke="#3b82f6" strokeWidth="2.5" />
        <circle cx="0" cy="0" r="10" fill="#f0f7ff" />
      </g>
      <g transform="translate(230, 320)">
        <circle cx="0" cy="0" r="17" fill="#FFFFFF" stroke="#1d4ed8" strokeWidth="3" />
        <circle cx="0" cy="0" r="11" fill="#dbeafe" />
        <circle cx="0" cy="0" r="4" fill="#1d4ed8" />
      </g>
      <g transform="translate(310, 320)">
        <circle cx="0" cy="0" r="16" fill="#FFFFFF" stroke="#60a5fa" strokeWidth="2.5" />
        <circle cx="0" cy="0" r="10" fill="#f0f7ff" />
      </g>
      <g transform="translate(400, 320)">
        <circle cx="0" cy="0" r="16" fill="#FFFFFF" stroke="#60a5fa" strokeWidth="2.5" />
        <circle cx="0" cy="0" r="10" fill="#f0f7ff" />
      </g>
    </Box>
  );
};

/**
 * Each card carries its own icon-tile gradient. Three shades of the same blue
 * rather than three different hues: the cards should look like a set, and the
 * tile is the only saturated thing on an otherwise pale surface.
 */
const VALUE_PROPS = [
  {
    icon: <Groups2OutlinedIcon />,
    kicker: "Shared editing",
    title: "Build your tree together",
    body: "Invite parents, cousins and in-laws to fill in the branch they know best. Everyone works on the same tree, and you decide who can edit what.",
    tile: "linear-gradient(to top right, #2563eb 0%, #3b82f6 100%)",
    tileShadow: "0 6px 16px rgba(59, 130, 246, 0.28)",
  },
  {
    icon: <NotificationsActiveOutlinedIcon />,
    kicker: "Reminders",
    title: "Never miss a family date",
    body: "Birthdays and anniversaries across the whole tree are gathered in one place, so the reminder reaches you before the day does.",
    tile: "linear-gradient(to top right, #0ea5e9 0%, #2563eb 100%)",
    tileShadow: "0 6px 16px rgba(14, 165, 233, 0.28)",
  },
  {
    icon: <PhotoLibraryOutlinedIcon />,
    kicker: "Photos & details",
    title: "Keep photos and stories together",
    body: "Attach photos, professions and the details elders remember to the people they belong to — kept with the relationship, not lost in a chat thread.",
    tile: "linear-gradient(to top right, #4f46e5 0%, #2563eb 100%)",
    tileShadow: "0 6px 16px rgba(79, 70, 229, 0.28)",
  },
];

/**
 * Marketing homepage for signed-out visitors.
 *
 * This is the acquisition surface: it explains what Kinvia is to someone who
 * has never seen it, and routes them to sign-up or to browsing public trees.
 * Signed-in users get the dashboard instead — nothing here reads user state.
 */
export const LandingPage: React.FC<LandingPageProps> = ({
  searchSlot,
  totalPeople,
  totalTrees,
  totalLocations,
  totalBusinesses,
  statsLoading = false,
}) => {
  const stats = [
    { label: "people recorded", value: totalPeople, icon: <PeopleOutlineIcon /> },
    { label: "family trees", value: totalTrees, icon: <AccountTreeOutlinedIcon /> },
    { label: "locations", value: totalLocations, icon: <LocationCityOutlinedIcon /> },
    { label: "family businesses", value: totalBusinesses, icon: <StorefrontOutlinedIcon /> },
  ];

  return (
    <Box component="main" sx={{ overflowX: "hidden" }}>
      {/* ---------------------------------------------------------------- Hero */}
      <Box
        component="section"
        sx={{ background: heroSurface, borderBottom: "1px solid", borderColor: washBorder }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" },
              gap: { xs: 4, md: 6 },
              alignItems: "center",
            }}
          >
            {/* minWidth:0 stops long words in the headline from forcing the
                grid track — and the page — wider than the viewport. */}
            <Box sx={{ minWidth: 0 }}>
              {/* Eyebrow, as a pill: it reads as a product badge rather than a
                  stray line of small caps above the headline. */}
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  display: "inline-flex",
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 999,
                  border: "1px solid",
                  borderColor: brand.border,
                  bgcolor: brand.surface,
                }}
              >
                <AutoStoriesOutlinedIcon sx={{ fontSize: 16, color: brand.primary }} />
                <Typography
                  component="span"
                  sx={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    color: brand.primary,
                  }}
                >
                  KINVIA LINEAGE
                </Typography>
                <Box
                  sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: brand.slateMuted }}
                />
                <Typography component="span" sx={{ fontSize: 12, color: brand.slateMuted }}>
                  Living Family Archives
                </Typography>
              </Stack>

              <Typography
                component="h1"
                sx={{
                  mt: 2,
                  fontWeight: 800,
                  fontSize: { xs: 32, sm: 40, md: 50 },
                  lineHeight: 1.12,
                  letterSpacing: "-0.02em",
                  color: brand.ink,
                }}
              >
                Your family's{" "}
                <Box component="span" sx={{ position: "relative", color: brand.primary }}>
                  lineage
                  {/* Hand-drawn underline: the one flourish on an otherwise plain
                      headline, so it has to sit under the word it emphasises
                      rather than float under the whole line. */}
                  <Box
                    component="svg"
                    aria-hidden="true"
                    viewBox="0 0 120 10"
                    preserveAspectRatio="none"
                    sx={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: { xs: -4, md: -8 },
                      width: "100%",
                      height: { xs: 6, md: 10 },
                      overflow: "visible",
                    }}
                  >
                    <path
                      d="M0 6 Q 7.5 1, 15 6 T 30 6 T 45 6 T 60 6 T 75 6 T 90 6 T 105 6 T 120 6"
                      fill="none"
                      stroke="#93c5fd"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </Box>
                </Box>
                , stories and photos — kept in one place, for good.
              </Typography>

              <Typography
                sx={{
                  mt: 2.5,
                  fontSize: { xs: 15, md: 17 },
                  lineHeight: 1.6,
                  color: brand.slate,
                  maxWidth: 560,
                }}
              >
                Map how everyone is related, record the details only the elders remember, and pass
                the whole thing on to the next generation instead of losing it.
              </Typography>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ mt: 3.5, alignItems: { xs: "stretch", sm: "center" } }}
              >
                <Button
                  component={Link}
                  to="/login"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    minHeight: TOUCH_TARGET,
                    px: 3.5,
                    fontWeight: 700,
                    borderRadius: 999,
                    bgcolor: brand.primary,
                    "&:hover": { bgcolor: brand.primaryDark },
                  }}
                >
                  Get started
                </Button>
                {/* Points at the location directory, not /families. Opening a
                    tree needs an account, but browsing which families exist and
                    how big they are does not — so a visitor gets to see their
                    village is already here before being asked to sign up. */}
                <Button
                  component={Link}
                  to="/locations"
                  variant="outlined"
                  size="large"
                  sx={{
                    minHeight: TOUCH_TARGET,
                    px: 3.5,
                    fontWeight: 700,
                    borderRadius: 999,
                    bgcolor: brand.surface,
                    borderColor: brand.border,
                    color: brand.ink,
                    "&:hover": { borderColor: brand.primary, color: brand.primary },
                  }}
                >
                  Browse families by location
                </Button>
              </Stack>

              {searchSlot ? (
                <Box sx={{ mt: 3.5, maxWidth: 620 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Box
                      sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: brand.primary }}
                    />
                    <Typography sx={{ fontSize: 13, color: brand.slateMuted }}>
                      Already listed? Look for a relative or a family business.
                    </Typography>
                  </Stack>
                  {searchSlot}
                </Box>
              ) : null}

              {/* Counts, straight from the database rather than a marketing
                  round number — this is a directory, and its size is the claim.
                  Which is also why the line is absent until they arrive: "0
                  people recorded" is a worse claim than saying nothing. */}
              {!statsLoading && totalPeople > 0 && (
              <Stack
                direction="row"
                spacing={{ xs: 2, sm: 3 }}
                flexWrap="wrap"
                useFlexGap
                sx={{ mt: 2.5 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: brand.primary }}
                  />
                  <Typography sx={{ fontSize: 13, color: brand.slate }}>
                    <Box component="span" sx={{ fontWeight: 800, color: brand.ink }}>
                      <AnimatedCounter value={totalPeople} loading={statsLoading} />
                    </Box>{" "}
                    people recorded
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: brand.accent }}
                  />
                  <Typography sx={{ fontSize: 13, color: brand.slate }}>
                    <Box component="span" sx={{ fontWeight: 800, color: brand.ink }}>
                      <AnimatedCounter value={totalTrees} loading={statsLoading} />
                    </Box>{" "}
                    families mapped across{" "}
                    <Box component="span" sx={{ fontWeight: 800, color: brand.ink }}>
                      <AnimatedCounter value={totalLocations} loading={statsLoading} />
                    </Box>{" "}
                    places
                  </Typography>
                </Stack>
              </Stack>
              )}
            </Box>

            {/* Ornamental only — dropped on phones, where the copy and CTAs
                should own the first screen. */}
            <Box
              sx={{
                display: { xs: "none", md: "block" },
                minWidth: 0,
                position: "relative",
                pt: 5,
                pb: 7,
              }}
            >
              {/* Sample-tree badge. Named after the chart below it so the two
                  never contradict each other. */}
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  px: 1.75,
                  py: 1,
                  borderRadius: 999,
                  bgcolor: brand.surface,
                  border: "1px solid",
                  borderColor: brand.border,
                  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                  zIndex: 2,
                }}
              >
                <VerifiedOutlinedIcon sx={{ fontSize: 18, color: brand.primary }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.ink }}>
                  Sample tree · 3 generations
                </Typography>
              </Stack>

              {/* White disc behind the chart, so the pedigree reads as one object
                  sitting on the hero wash instead of lines floating on a tint. */}
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  maxWidth: 460,
                  mx: "auto",
                  aspectRatio: "1 / 1",
                  borderRadius: "50%",
                  bgcolor: brand.surface,
                  boxShadow: "0 24px 60px rgba(15,23,42,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  // Tight: a square chart inscribed in a circle already loses the
                  // corners, and extra padding leaves it swimming.
                  p: 1,
                }}
              >
                <HeroTreeGraphic />
              </Box>

              {/* A memory hanging off the tree — the point of the product in one
                  card. It shows a family photo because that is a feature this
                  app actually has. */}
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                  position: "absolute",
                  left: { md: 0, lg: 8 },
                  bottom: 8,
                  px: 1.75,
                  py: 1.5,
                  borderRadius: 3,
                  bgcolor: brand.surface,
                  border: "1px solid",
                  borderColor: brand.border,
                  boxShadow: "0 16px 40px rgba(15,23,42,0.12)",
                  maxWidth: 280,
                  zIndex: 2,
                }}
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    flexShrink: 0,
                    borderRadius: 2,
                    bgcolor: brand.primary,
                    color: brand.surface,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <PhotoLibraryOutlinedIcon sx={{ fontSize: 22 }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box
                      sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: brand.primary }}
                    />
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        color: brand.primary,
                      }}
                    >
                      FAMILY PHOTOS
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontWeight: 800, color: brand.ink, fontSize: 15 }} noWrap>
                    The bakery, 1954
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: brand.slateMuted }}>
                    Kept with the people in it
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: sectionSpacing }}>
        {/* ------------------------------------------------------- Value props */}
        <Box component="section">
          <Typography component="p" sx={eyebrowPillSx}>
            Why Kinvia
          </Typography>
          <Typography component="h2" sx={{ ...(sectionTitleSx as object), mt: 1 }}>
            One place for everything a family forgets
          </Typography>

          <Box
            sx={{
              mt: 3,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
              gap: { xs: 2, md: 2.5 },
            }}
          >
            {VALUE_PROPS.map((item) => (
              <Box
                key={item.title}
                sx={{
                  p: { xs: 2.5, md: 3.5 },
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: "rgba(219, 234, 254, 0.9)",
                  bgcolor: "#f8faff",
                  boxShadow: "0 4px 20px -4px rgba(29, 78, 216, 0.05)",
                  transition: "background-color 300ms ease, box-shadow 300ms ease, border-color 300ms ease",
                  "@media (hover: hover)": {
                    "&:hover": {
                      bgcolor: brand.surface,
                      borderColor: "#bfdbfe",
                      boxShadow: "0 20px 40px -15px rgba(29, 78, 216, 0.15)",
                    },
                  },
                }}
              >
                {/* A full-width bar rather than a small square tile: it caps the
                    card, gives the three cards one strong horizontal rhythm, and
                    leaves the icon centred with room to breathe. */}
                <Box
                  sx={{
                    width: "100%",
                    height: 52,
                    borderRadius: 2.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: item.tile,
                    boxShadow: item.tileShadow,
                    color: "#ffffff",
                    "& svg": { fontSize: 26 },
                  }}
                >
                  {item.icon}
                </Box>
                <Typography
                  sx={{
                    mt: 2,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: brand.primary,
                  }}
                >
                  {item.kicker}
                </Typography>
                <Typography sx={{ mt: 0.5, fontWeight: 800, fontSize: 18, color: brand.ink }}>
                  {item.title}
                </Typography>
                <Typography sx={{ mt: 1, fontSize: 14.5, lineHeight: 1.65, color: brand.slate }}>
                  {item.body}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ------------------------------------------------------- Scale proof */}
        <Box component="section" sx={{ mt: sectionSpacing }}>
          <Typography component="p" sx={eyebrowPillSx}>
            Already on Kinvia
          </Typography>
          <Typography component="h2" sx={{ ...(sectionTitleSx as object), mt: 1 }}>
            You won't be starting from an empty page
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 15, lineHeight: 1.6, color: brand.slate, maxWidth: 620 }}>
            Families are already keeping their records here — your relatives may be among them.
          </Typography>

          <Box
            sx={{
              mt: 3,
              display: "grid",
              gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
              gap: { xs: 1.5, md: 2 },
            }}
          >
            {stats.map((stat) => (
              <Box key={stat.label} sx={{ ...(tileSx as object), p: { xs: 2, md: 2.5 } }}>
                <Box sx={{ display: "flex", color: brand.primary }}>{stat.icon}</Box>
                <Typography
                  sx={{ mt: 1.2, fontWeight: 800, fontSize: { xs: 24, md: 30 }, color: brand.ink }}
                >
                  <AnimatedCounter value={stat.value} loading={statsLoading} />
                </Typography>
                <Typography sx={{ mt: 0.3, fontSize: 13, color: brand.slateMuted }}>
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Container>

      {/* --------------------------------------------------------- Closing CTA */}
      {/* ------------------------------------------------- Closing call to action */}
      <Box component="section" sx={{ background: ctaGradient, color: "#ffffff" }}>
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 }, textAlign: "center" }}>
          <Typography
            component="span"
            sx={{
              display: "inline-block",
              px: 2,
              py: 0.75,
              mb: 2.5,
              borderRadius: 999,
              bgcolor: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              backdropFilter: "blur(6px)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Start with what you know today
          </Typography>

          <Typography
            component="h2"
            sx={{
              fontWeight: 800,
              fontSize: { xs: 26, sm: 34, md: 40 },
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              maxWidth: 680,
              mx: "auto",
            }}
          >
            Give your grandchildren the gift of knowing where they came from.
          </Typography>

          <Typography
            sx={{
              mt: 2,
              mb: 4,
              fontSize: { xs: 15, md: 17 },
              lineHeight: 1.65,
              color: "#dbeafe",
              maxWidth: 560,
              mx: "auto",
            }}
          >
            Begin by naming yourself and your parents. Kinvia will guide you one memory, branch, and
            photograph at a time.
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ justifyContent: "center", alignItems: { xs: "stretch", sm: "center" } }}
          >
            <Button
              component={Link}
              to="/login"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{
                minHeight: TOUCH_TARGET,
                px: 4,
                fontWeight: 800,
                borderRadius: 999,
                bgcolor: brand.surface,
                color: brand.primary,
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                "&:hover": {
                  bgcolor: brand.primarySoft,
                  boxShadow: "0 15px 30px rgba(0,0,0,0.25)",
                },
              }}
            >
              Create your tree in 2 minutes
            </Button>
            {/* The design's second button was "Browse Sample Archives"; there is
                no such thing here. The location directory is the real version of
                that offer — public, and it shows the families already recorded. */}
            <Button
              component={Link}
              to="/locations"
              size="large"
              sx={{
                minHeight: TOUCH_TARGET,
                px: 3.5,
                fontWeight: 700,
                borderRadius: 999,
                color: "#ffffff",
                bgcolor: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.30)",
                backdropFilter: "blur(4px)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.20)" },
              }}
            >
              Browse families by location
            </Button>
          </Stack>

          <Typography
            sx={{ mt: 3, fontSize: 13, color: "#bfdbfe", letterSpacing: "0.02em" }}
          >
            No credit card required • Private by default • Invite unlimited relatives
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
