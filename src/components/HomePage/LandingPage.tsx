import React from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import LocationCityOutlinedIcon from "@mui/icons-material/LocationCityOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";

import { AnimatedCounter } from "../common/AnimatedCounter";
import { brand } from "../../theme/brand";
import { eyebrowSx, heroSurface, panelSx, sectionSpacing, sectionTitleSx, tileSx } from "./homeTheme";

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

/** Connector stroke for the hero diagram — the warm hero wash swallows
 *  `brand.border`, so the lines need a slightly heavier neutral. */
const DIAGRAM_STROKE = "rgba(100, 116, 139, 0.45)";

/**
 * Decorative three-generation family tree for the hero.
 *
 * Inline (rather than an asset) so it inherits the brand tokens and stays
 * crisp at any width; purely ornamental, hence `aria-hidden`. The viewBox does
 * all the scaling work — the element itself is never given a pixel width.
 */
const HeroTreeGraphic: React.FC = () => (
  <Box
    component="svg"
    viewBox="0 0 360 240"
    role="presentation"
    aria-hidden="true"
    focusable="false"
    sx={{ display: "block", width: "100%", maxWidth: 420, height: "auto", mx: "auto" }}
  >
    {/* Ambient wash so the diagram reads as an illustration, not a chart. */}
    <circle cx="180" cy="120" r="112" fill="rgba(13, 110, 253, 0.05)" />
    <circle cx="180" cy="120" r="72" fill="rgba(22, 163, 74, 0.05)" />

    <g stroke={DIAGRAM_STROKE} strokeWidth="1.6" strokeLinecap="round" fill="none">
      {/* Grandparents, joined, dropping to the sibling bus. */}
      <path d="M167 34 H193" />
      <path d="M180 34 V84" />
      {/* Sibling bus feeding the middle generation. */}
      <path d="M80 84 H280" />
      <path d="M80 84 V97" />
      <path d="M180 84 V97" />
      <path d="M280 84 V97" />
      {/* Third generation under the outer two children. */}
      <path d="M80 127 V166" />
      <path d="M46 166 H114" />
      <path d="M46 166 V183" />
      <path d="M114 166 V183" />
      <path d="M280 127 V166" />
      <path d="M246 166 H314" />
      <path d="M246 166 V183" />
      <path d="M314 166 V183" />
      <path d="M180 127 V183" />
    </g>

    {/* Generation 1 — haloed so the eye starts at the root. */}
    <g>
      <circle cx="150" cy="34" r="24" fill="rgba(13, 110, 253, 0.10)" />
      <circle cx="210" cy="34" r="24" fill="rgba(13, 110, 253, 0.10)" />
      <circle cx="150" cy="34" r="17" fill={brand.primarySoft} stroke={brand.primary} strokeWidth="2" />
      <circle cx="210" cy="34" r="17" fill={brand.primarySoft} stroke={brand.primary} strokeWidth="2" />
    </g>

    {/* Generation 2 */}
    <g fill={brand.accentSoft} stroke={brand.accent} strokeWidth="2">
      <circle cx="80" cy="112" r="15" />
      <circle cx="180" cy="112" r="15" />
      <circle cx="280" cy="112" r="15" />
    </g>

    {/* Generation 3 */}
    <g fill={brand.surface} stroke={brand.slateMuted} strokeWidth="1.8">
      <circle cx="46" cy="196" r="13" />
      <circle cx="114" cy="196" r="13" />
      <circle cx="180" cy="196" r="13" />
      <circle cx="246" cy="196" r="13" />
      <circle cx="314" cy="196" r="13" />
    </g>
  </Box>
);

const VALUE_PROPS = [
  {
    icon: <Groups2OutlinedIcon />,
    title: "Build your tree together",
    body: "Invite parents, cousins and in-laws to fill in the branch they know best. Everyone works on the same tree, and you decide who can edit what.",
  },
  {
    icon: <NotificationsActiveOutlinedIcon />,
    title: "Never miss a family date",
    body: "Birthdays and anniversaries across the whole tree are gathered in one place, so the reminder reaches you before the day does.",
  },
  {
    icon: <PhotoLibraryOutlinedIcon />,
    title: "Keep photos and stories together",
    body: "Attach photos, professions and the details elders remember to the people they belong to — kept with the relationship, not lost in a chat thread.",
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
        sx={{ background: heroSurface, borderBottom: "1px solid", borderColor: brand.border }}
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
              <Typography component="p" sx={eyebrowSx}>
                Kinvia
              </Typography>
              <Typography
                component="h1"
                sx={{
                  mt: 1.5,
                  fontWeight: 800,
                  fontSize: { xs: 30, sm: 38, md: 46 },
                  lineHeight: 1.15,
                  color: brand.ink,
                }}
              >
                Your family's lineage, stories and photos — kept in one place, for good.
              </Typography>
              <Typography
                sx={{
                  mt: 2,
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
                    px: 3,
                    fontWeight: 700,
                    borderRadius: 2,
                    bgcolor: brand.primary,
                    "&:hover": { bgcolor: brand.primaryDark },
                  }}
                >
                  Get started
                </Button>
                <Button
                  component={Link}
                  to="/families"
                  variant="outlined"
                  size="large"
                  sx={{
                    minHeight: TOUCH_TARGET,
                    px: 3,
                    fontWeight: 700,
                    borderRadius: 2,
                    bgcolor: brand.surface,
                    borderColor: brand.border,
                    color: brand.ink,
                    "&:hover": { borderColor: brand.primary, color: brand.primary },
                  }}
                >
                  Explore family trees
                </Button>
              </Stack>

              {searchSlot ? (
                <Box sx={{ mt: 3.5, maxWidth: 560 }}>
                  <Typography sx={{ mb: 1, fontSize: 13, color: brand.slateMuted }}>
                    Already listed? Look for a relative or a family business.
                  </Typography>
                  {searchSlot}
                </Box>
              ) : null}
            </Box>

            {/* Ornamental only — dropped on phones, where the copy and CTAs
                should own the first screen. */}
            <Box sx={{ display: { xs: "none", md: "block" }, minWidth: 0 }}>
              <HeroTreeGraphic />
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: sectionSpacing }}>
        {/* ------------------------------------------------------- Value props */}
        <Box component="section">
          <Typography component="p" sx={eyebrowSx}>
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
              <Box key={item.title} sx={{ ...(panelSx as object), p: { xs: 2.5, md: 3 } }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: brand.primarySoft,
                    color: brand.primary,
                  }}
                >
                  {item.icon}
                </Box>
                <Typography sx={{ mt: 2, fontWeight: 700, fontSize: 17, color: brand.ink }}>
                  {item.title}
                </Typography>
                <Typography sx={{ mt: 1, fontSize: 14.5, lineHeight: 1.6, color: brand.slate }}>
                  {item.body}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ------------------------------------------------------- Scale proof */}
        <Box component="section" sx={{ mt: sectionSpacing }}>
          <Typography component="p" sx={eyebrowSx}>
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
      <Box
        component="section"
        sx={{ background: heroSurface, borderTop: "1px solid", borderColor: brand.border }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 }, textAlign: "center" }}>
          <Typography
            component="h2"
            sx={{
              fontWeight: 800,
              fontSize: { xs: 22, sm: 28 },
              lineHeight: 1.25,
              color: brand.ink,
            }}
          >
            Start with one name
          </Typography>
          <Typography
            sx={{ mt: 1.5, fontSize: { xs: 15, md: 16 }, color: brand.slate, mx: "auto", maxWidth: 560 }}
          >
            Add yourself, then your parents. The rest of the family can join in and fill the branches
            you don't know.
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ mt: 3, justifyContent: "center", alignItems: { xs: "stretch", sm: "center" } }}
          >
            <Button
              component={Link}
              to="/login"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{
                minHeight: TOUCH_TARGET,
                px: 3,
                fontWeight: 700,
                borderRadius: 2,
                bgcolor: brand.primary,
                "&:hover": { bgcolor: brand.primaryDark },
              }}
            >
              Get started
            </Button>
            <Button
              component={Link}
              to="/about"
              variant="text"
              size="large"
              sx={{ minHeight: TOUCH_TARGET, px: 2.5, fontWeight: 700, color: brand.slate }}
            >
              Learn more about Kinvia
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
