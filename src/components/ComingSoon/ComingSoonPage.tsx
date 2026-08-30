import React from "react";
import { keyframes } from "@emotion/react";
import { Box, Card, CardContent, Chip, Link, Stack, Typography } from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import Diversity3OutlinedIcon from "@mui/icons-material/Diversity3Outlined";
import CelebrationOutlinedIcon from "@mui/icons-material/CelebrationOutlined";
import HistoryEduOutlinedIcon from "@mui/icons-material/HistoryEduOutlined";
import { brand, pageGradient } from "../../theme/brand";

const highlights = [
  {
    icon: <AccountTreeOutlinedIcon fontSize="small" />,
    title: "Build your family tree",
    text: "Add relatives, photos, and details — and watch generations take shape in one shared, searchable tree.",
  },
  {
    icon: <Diversity3OutlinedIcon fontSize="small" />,
    title: "Connect across families",
    text: "Link marriages between family trees so relatives stay connected instead of scattered across separate records.",
  },
  {
    icon: <CelebrationOutlinedIcon fontSize="small" />,
    title: "Never miss an occasion",
    text: "Birthdays, anniversaries, and remembrance days surface automatically, so the family can share wishes together.",
  },
  {
    icon: <HistoryEduOutlinedIcon fontSize="small" />,
    title: "Preserve your heritage",
    text: "Keep a living record of lineage, village roots, professions, and family businesses for the generations ahead.",
  },
];

const fadeUp = keyframes`
  from { opacity: 0; transform: translate3d(0, 18px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
`;

const float = keyframes`
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(0, -10px, 0); }
`;

const drift = keyframes`
  from { transform: translate3d(0, 0, 0) scale(1); }
  to   { transform: translate3d(40px, -30px, 0) scale(1.15); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.35); }
  50%      { box-shadow: 0 0 0 10px rgba(22, 163, 74, 0); }
`;

const shimmer = keyframes`
  from { background-position: 200% center; }
  to   { background-position: -200% center; }
`;

type Blob = {
  bg: string;
  size: number;
  duration: number;
  opacity: number;
  top?: string;
  left?: string;
  bottom?: string;
  right?: string;
};

/** Decorative background blobs, drifting on their own slow loops. */
const blobs: Blob[] = [
  { bg: brand.primary, size: 420, top: "-12%", left: "-10%", duration: 18, opacity: 0.16 },
  { bg: brand.accent, size: 360, bottom: "-14%", right: "-8%", duration: 24, opacity: 0.13 },
];

/**
 * Entrance animation, staggered by `delay`. Only applied when the visitor has
 * not asked for reduced motion — the un-animated styles are the default, so the
 * page is fully legible either way.
 */
const entrance = (delay: number) => ({
  "@media (prefers-reduced-motion: no-preference)": {
    animation: `${fadeUp} 0.7s cubic-bezier(0.16, 1, 0.3, 1) both`,
    animationDelay: `${delay}s`,
  },
});

/**
 * Pre-launch landing page. Rendered INSTEAD of the whole app while the
 * `VITE_COMING_SOON` flag is on — see `utils/comingSoon.ts` for the flag
 * and the team bypass.
 */
export function ComingSoonPage(): React.ReactElement {
  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        background: pageGradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 2, sm: 3 },
        py: { xs: 5, sm: 8 },
      }}
    >
      {/* Slow-drifting colour blobs behind the content. Transform/opacity only,
          so they stay on the compositor and cost nothing on scroll. */}
      {blobs.map((blob, index) => (
        <Box
          key={index}
          aria-hidden
          sx={{
            position: "absolute",
            width: blob.size,
            height: blob.size,
            top: blob.top,
            left: blob.left,
            bottom: blob.bottom,
            right: blob.right,
            borderRadius: "50%",
            background: blob.bg,
            opacity: blob.opacity,
            filter: "blur(90px)",
            pointerEvents: "none",
            "@media (prefers-reduced-motion: no-preference)": {
              animation: `${drift} ${blob.duration}s ease-in-out infinite alternate`,
            },
          }}
        />
      ))}

      <Box sx={{ position: "relative", width: "100%", maxWidth: 900, textAlign: "center" }}>
        <Box sx={entrance(0)}>
          <Box
            component="img"
            src="/favic_no_background.png"
            alt="Kinvia"
            sx={{
              width: { xs: 72, sm: 88 },
              height: "auto",
              mb: 2,
              "@media (prefers-reduced-motion: no-preference)": {
                animation: `${float} 3.5s ease-in-out infinite alternate`,
              },
            }}
          />
        </Box>

        <Box sx={entrance(0.1)}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              lineHeight: 1.1,
              fontSize: { xs: "2.25rem", sm: "3rem", md: "3.5rem" },
              color: brand.ink,
              // Slow light sweep across the wordmark.
              "@media (prefers-reduced-motion: no-preference)": {
                background: `linear-gradient(90deg, ${brand.ink} 25%, ${brand.primary} 42%, ${brand.accent} 54%, ${brand.ink} 70%)`,
                backgroundSize: "200% auto",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: `${shimmer} 7s linear 1s infinite`,
              },
            }}
          >
            Kinvia
          </Typography>
        </Box>

        <Box sx={entrance(0.22)}>
          <Chip
            label="Launching soon"
            sx={{
              mt: 2,
              px: 1,
              fontWeight: 700,
              letterSpacing: 0.4,
              color: brand.accentDark,
              bgcolor: brand.accentSoft,
              "@media (prefers-reduced-motion: no-preference)": {
                animation: `${pulse} 2.8s ease-out infinite`,
              },
            }}
          />
        </Box>

        <Typography
          variant="h6"
          sx={{
            mt: 3,
            mx: "auto",
            maxWidth: 680,
            fontWeight: 500,
            color: "text.secondary",
            lineHeight: 1.6,
            ...entrance(0.32),
          }}
        >
          A digital family-tree platform that helps communities preserve their
          roots — build family trees, connect relatives across families, and
          keep a living record of lineage, location, and legacy.
        </Typography>

        <Typography
          variant="body1"
          sx={{ mt: 2, mx: "auto", maxWidth: 680, color: "text.secondary", ...entrance(0.42) }}
        >
          We're putting the finishing touches on it. A family's story is spread
          across memories, documents, and different branches of the family —
          Kinvia brings it all together in one place.
        </Typography>

        <Box
          sx={{
            mt: { xs: 4, sm: 6 },
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 2,
            textAlign: "left",
          }}
        >
          {highlights.map((item, index) => (
            <Card
              key={item.title}
              variant="outlined"
              sx={{
                borderRadius: 2.5,
                height: "100%",
                bgcolor: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(6px)",
                transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  borderColor: brand.primary,
                  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.10)",
                },
                ...entrance(0.55 + index * 0.1),
              }}
            >
              <CardContent>
                <Stack
                  direction="row"
                  spacing={1.2}
                  alignItems="center"
                  sx={{ mb: 1, color: brand.primary }}
                >
                  {item.icon}
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, color: "text.primary" }}
                  >
                    {item.title}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {item.text}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Typography
          variant="body2"
          sx={{ mt: { xs: 4, sm: 6 }, color: "text.secondary", ...entrance(1.05) }}
        >
          Want to be part of it when we open up? Write to us at{" "}
          <Link href="mailto:info@kinvia.in" underline="hover" sx={{ fontWeight: 600 }}>
            info@kinvia.in
          </Link>
          .
        </Typography>

        <Typography
          variant="caption"
          sx={{ display: "block", mt: 3, color: brand.slateMuted, ...entrance(1.15) }}
        >
          © {new Date().getFullYear()} Kinvia
        </Typography>
      </Box>
    </Box>
  );
}

export default ComingSoonPage;
