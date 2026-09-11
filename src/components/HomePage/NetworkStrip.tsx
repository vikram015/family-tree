import React from "react";
import { Box, Typography } from "@mui/material";
import { AnimatedCounter } from "../common/AnimatedCounter";
import { brand } from "../../theme/brand";
import { eyebrowSx, panelSx } from "./homeTheme";

export interface NetworkStripProps {
  totalPeople: number;
  totalTrees: number;
  totalLocations: number;
  totalBusinesses: number;
  loading?: boolean;
}

/**
 * Platform-wide counters, closing the page.
 *
 * These numbers used to be four cards in the hero, which made global totals look
 * like the visitor's own family data. They stay last and stay label-led — the
 * figures are large because this is the page's closing note, but the eyebrow
 * says "Across Kinvia" so they are never mistaken for the user's own tree.
 */
export const NetworkStrip: React.FC<NetworkStripProps> = ({
  totalPeople,
  totalTrees,
  totalLocations,
  totalBusinesses,
  loading = false,
}) => {
  const figures = [
    { label: "Members", value: totalPeople },
    { label: "Family Trees", value: totalTrees },
    { label: "Locations", value: totalLocations },
    { label: "Businesses", value: totalBusinesses },
  ];

  return (
    <Box component="section" aria-label="Kinvia network totals">
      <Typography sx={{ ...(eyebrowSx as object), mb: 1 }}>Across Kinvia</Typography>

      <Box
        sx={{
          ...(panelSx as object),
          display: "grid",
          // 2x2 on phones, one flat row from sm up.
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" },
          rowGap: { xs: 3, sm: 0 },
          alignItems: "center",
          px: { xs: 2, sm: 3 },
          py: { xs: 3, sm: 3.5 },
          // Dividers only where the row is unbroken — on a wrapped 2x2 grid a
          // left border would land mid-row and read as a stray line.
          "& > *": {
            borderLeft: { xs: 0, sm: "1px solid #f1f5f9" },
          },
          "& > *:first-of-type": { borderLeft: 0 },
        }}
      >
        {figures.map((figure) => (
          <Box key={figure.label} sx={{ px: { xs: 0.5, sm: 2 }, textAlign: "center", minWidth: 0 }}>
            <Typography
              component="div"
              sx={{
                fontSize: { xs: 24, sm: 30 },
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                color: brand.ink,
              }}
            >
              <AnimatedCounter value={figure.value} loading={loading} />
            </Typography>
            <Typography
              component="div"
              sx={{
                mt: 0.5,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: brand.slateMuted,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {figure.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default NetworkStrip;
