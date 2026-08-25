import React from "react";
import { Box, Typography } from "@mui/material";
import { AnimatedCounter } from "../common/AnimatedCounter";
import { brand } from "../../theme/brand";
import { eyebrowSx } from "./homeTheme";

export interface NetworkStripProps {
  totalPeople: number;
  totalTrees: number;
  totalLocations: number;
  totalBusinesses: number;
  loading?: boolean;
}

/**
 * Platform-wide counters as a single thin bar.
 *
 * These numbers used to be four cards in the hero, which made global totals
 * look like the visitor's own family data. Demoted here: muted, small, no
 * shadow — present for credibility, never competing with the sections above.
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
      <Typography sx={{ ...(eyebrowSx as object), mb: 0.75 }}>Across Kinvia</Typography>

      <Box
        sx={{
          display: "grid",
          // 2x2 on phones, one flat row from sm up.
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" },
          rowGap: { xs: 1.5, sm: 0 },
          alignItems: "center",
          borderRadius: 2.5,
          border: "1px solid",
          borderColor: brand.border,
          bgcolor: brand.canvas,
          px: { xs: 1.5, sm: 2 },
          py: { xs: 1.5, sm: 1.25 },
          // Dividers only where the row is unbroken — on a wrapped 2x2 grid a
          // left border would land mid-row and read as a stray line.
          "& > *": {
            borderLeft: { xs: 0, sm: `1px solid ${brand.border}` },
          },
          "& > *:first-of-type": { borderLeft: 0 },
        }}
      >
        {figures.map((figure) => (
          <Box key={figure.label} sx={{ px: { xs: 0.5, sm: 2 }, textAlign: "center", minWidth: 0 }}>
            <Typography
              component="div"
              sx={{
                fontSize: { xs: 17, sm: 18 },
                fontWeight: 700,
                lineHeight: 1.2,
                color: brand.slate,
              }}
            >
              <AnimatedCounter value={figure.value} loading={loading} />
            </Typography>
            <Typography
              component="div"
              sx={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.03em",
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
