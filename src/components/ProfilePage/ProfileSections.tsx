import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import { brand } from "../../theme/brand";

/**
 * Building blocks for the profile page layout: white cards on the page canvas,
 * small labelled tiles for single facts, and the generations path.
 *
 * Colours come from the app's `brand` tokens so the page matches the rest of
 * Kinvia; only the layout follows the profile redesign.
 */

const CARD_SHADOW = "0 4px 16px -4px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03)";

export const ProfileCard: React.FC<{ children: React.ReactNode; sx?: SxProps<Theme> }> = ({ children, sx }) => (
  <Paper
    elevation={0}
    sx={{
      p: { xs: 2.5, md: 3.5 },
      height: "100%",
      borderRadius: 4,
      border: `1px solid ${brand.border}`,
      boxShadow: CARD_SHADOW,
      bgcolor: brand.surface,
      position: "relative",
      overflow: "hidden",
      ...(sx as object),
    }}
  >
    {children}
  </Paper>
);

/** A card's title row: icon well, title, optional subtitle, optional action. */
export const CardHeading: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ icon, title, subtitle, action }) => (
  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ mb: 2.5 }}>
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 2,
            bgcolor: brand.primarySoft,
            color: brand.primary,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            "& svg": { fontSize: 19 },
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: { xs: 17, md: 19 }, color: brand.ink }}>{title}</Typography>
      </Stack>
      {subtitle && (
        <Typography sx={{ mt: 0.75, fontSize: 14, color: brand.slateMuted }}>{subtitle}</Typography>
      )}
    </Box>
    {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
  </Stack>
);

/** One fact: icon, small label, value. */
export const InfoTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}> = ({ icon, label, value, muted }) => (
  <Stack
    direction="row"
    spacing={1.5}
    alignItems="center"
    sx={{ p: 1.5, borderRadius: 2.5, bgcolor: brand.canvas, minWidth: 0 }}
  >
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: 2,
        bgcolor: brand.surface,
        color: brand.primary,
        display: "grid",
        placeItems: "center",
        boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
        flexShrink: 0,
        "& svg": { fontSize: 18 },
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 11.5, color: brand.slateMuted, fontWeight: 500 }}>{label}</Typography>
      <Typography
        noWrap
        sx={{ fontSize: 14, fontWeight: 600, color: muted ? brand.slateMuted : brand.ink }}
      >
        {value}
      </Typography>
    </Box>
  </Stack>
);

/** A labelled block with a link at its foot, e.g. the family tree or village. */
export const FeatureTile: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  caption?: React.ReactNode;
  icon: React.ReactNode;
  footer?: React.ReactNode;
  accent?: "primary" | "green";
}> = ({ eyebrow, title, caption, icon, footer, accent = "primary" }) => (
  <Stack
    justifyContent="space-between"
    sx={{ p: 2, borderRadius: 3, bgcolor: brand.canvas, height: "100%", minWidth: 0 }}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, color: brand.slateMuted }}
        >
          {eyebrow}
        </Typography>
        <Typography
          noWrap
          sx={{ mt: 0.5, fontSize: 18, fontWeight: 700, color: accent === "primary" ? brand.primary : brand.ink }}
        >
          {title}
        </Typography>
        {caption && <Typography sx={{ fontSize: 12.5, color: brand.slateMuted }}>{caption}</Typography>}
      </Box>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 2.5,
          bgcolor: brand.surface,
          color: accent === "primary" ? brand.primary : brand.accent,
          display: "grid",
          placeItems: "center",
          boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
    </Stack>
    {footer && <Box sx={{ mt: 1.5, fontSize: 12.5 }}>{footer}</Box>}
  </Stack>
);

/** Section title between card rows. */
export const SectionHeading: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <Box sx={{ mb: 2 }}>
    <Typography component="h2" sx={{ fontWeight: 800, fontSize: { xs: 20, md: 24 }, letterSpacing: "-0.01em", color: brand.ink }}>
      {title}
    </Typography>
    {subtitle && <Typography sx={{ fontSize: 14, color: brand.slateMuted }}>{subtitle}</Typography>}
  </Box>
);

export interface LineageStep {
  id: string;
  name: string;
  nameHindi?: string | null;
}

/**
 * Oldest recorded ancestor → … → this person, as connected generation markers.
 * Scrolls sideways when the line is long rather than squeezing names.
 */
export const LineagePath: React.FC<{ steps: LineageStep[]; selfLabel?: string }> = ({ steps, selfLabel = "You" }) => {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  // Open at the right-hand end: you and your nearest ancestors first. A long
  // line otherwise opened on the oldest names with "You" scrolled out of view.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [steps]);
  if (steps.length < 2) return null;
  const path = steps.map((s) => s.name).join(" › ");
  return (
    <Box sx={{ mt: 2.5, p: 2, borderRadius: 3, bgcolor: brand.canvas }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={0.5} sx={{ mb: 1.5 }}>
        <Typography
          sx={{ fontSize: 11.5, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600, color: brand.ink }}
        >
          Generations
        </Typography>
        <Typography noWrap sx={{ fontSize: 12, color: brand.slateMuted, maxWidth: { sm: "70%" } }} title={path}>
          {path}
        </Typography>
      </Stack>
      <Box ref={scrollRef} sx={{ overflowX: "auto", pb: 0.5 }}>
        <Stack direction="row" alignItems="flex-start" sx={{ minWidth: steps.length * 84 }}>
          {steps.map((step, index) => {
            const isSelf = index === steps.length - 1;
            return (
              <React.Fragment key={step.id}>
                {index > 0 && (
                  <Box
                    sx={{
                      flex: 1,
                      height: 2,
                      mt: "17px",
                      mx: 0.5,
                      bgcolor: isSelf ? brand.primary : "#cbd5e1",
                      minWidth: 16,
                    }}
                  />
                )}
                <Stack alignItems="center" sx={{ width: 76, flexShrink: 0 }}>
                  <Box
                    sx={{
                      width: isSelf ? 36 : 32,
                      height: isSelf ? 36 : 32,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      bgcolor: isSelf ? brand.primary : brand.surface,
                      color: isSelf ? "#fff" : brand.slateMuted,
                      boxShadow: isSelf ? `0 0 0 4px ${brand.primarySoft}` : "0 1px 2px rgba(15,23,42,0.08)",
                    }}
                  >
                    {isSelf ? selfLabel : `G${index + 1}`}
                  </Box>
                  <Typography
                    noWrap
                    title={step.name}
                    sx={{
                      mt: 0.75,
                      maxWidth: 76,
                      fontSize: 11.5,
                      fontWeight: isSelf ? 700 : 600,
                      color: isSelf ? brand.primary : brand.slateMuted,
                    }}
                  >
                    {step.name}
                  </Typography>
                </Stack>
              </React.Fragment>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
};
