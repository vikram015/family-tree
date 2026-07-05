import React, { useMemo } from "react";
import { Avatar, Box, Chip, Stack, Typography } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import type { FNode } from "../../model/FNode";
import { buildGenerations } from "./generations";
import { PersonTimelineCard } from "./PersonTimelineCard";
import { brand } from "../../../theme/brand";

interface TimelineViewProps {
  nodes: FNode[];
  currentTreeId?: string;
  youPersonId?: string | null;
  onViewDetails?: (nodeId: string) => void;
}

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <Stack direction="row" spacing={0.5} alignItems="center">
    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
  </Stack>
);

export const TimelineView: React.FC<TimelineViewProps> = ({
  nodes,
  currentTreeId,
  youPersonId,
  onViewDetails,
}) => {
  const generations = useMemo(
    () => buildGenerations(nodes, currentTreeId),
    [nodes, currentTreeId],
  );

  if (generations.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">No people to show yet.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", overflow: "auto", px: { xs: 1.5, sm: 3 }, py: { xs: 2, sm: 3 } }}>
      {/* Header + legend */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Ancestral Timeline
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Earliest generation at the top, flowing down to the living family.
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1.5}
          flexWrap="wrap"
          sx={{
            rowGap: 0.5,
            px: 1,
            py: 0.5,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <LegendDot color="#93c5fd" label="Men" />
          <LegendDot color="#f9a8d4" label="Women" />
          <Stack direction="row" spacing={0.5} alignItems="center">
            <FavoriteIcon sx={{ fontSize: 12, color: "#e11d48" }} />
            <Typography variant="caption" color="text.secondary">
              Marriage
            </Typography>
          </Stack>
          <LegendDot color="#f59e0b" label="You" />
        </Stack>
      </Stack>

      {/* Generations */}
      {generations.map((row, idx) => {
        const pairs = new Set(row.pairs.map(([a, b]) => pairKey(a, b)));
        const isLast = idx === generations.length - 1;
        return (
          <Stack key={row.generation} direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="stretch">
            {/* Left rail: numbered circle + connector */}
            <Stack alignItems="center" sx={{ width: { xs: 32, sm: 40 }, flexShrink: 0 }}>
              <Avatar
                sx={{
                  width: { xs: 28, sm: 34 },
                  height: { xs: 28, sm: 34 },
                  bgcolor: brand.surface,
                  color: "primary.main",
                  border: "2px solid",
                  borderColor: "primary.main",
                  fontWeight: 800,
                  fontSize: { xs: 12, sm: 14 },
                }}
              >
                {row.generation}
              </Avatar>
              {!isLast && <Box sx={{ flexGrow: 1, width: "2px", bgcolor: "divider", my: 0.5 }} />}
            </Stack>

            {/* Content */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                mb: 2,
                p: { xs: 1, sm: 1.5 },
                borderRadius: 2,
                backgroundColor: idx % 2 === 1 ? "rgba(148,163,184,0.08)" : "transparent",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Generation {row.generation}
                </Typography>
                {row.yearRange && (
                  <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 600 }}>
                    {row.yearRange}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  · {row.people.length} {row.people.length === 1 ? "person" : "people"}
                </Typography>
              </Stack>

              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: { xs: 1, sm: 1.5 } }}>
                {row.people.map((person, i) => {
                  const next = row.people[i + 1];
                  const showHeart = next && pairs.has(pairKey(person.id, next.id));
                  return (
                    <React.Fragment key={person.id}>
                      <Box sx={{ width: { xs: "100%", sm: 230 } }}>
                        <PersonTimelineCard
                          node={person}
                          isYou={!!youPersonId && person.id === youPersonId}
                          onClick={onViewDetails ? (n) => onViewDetails(n.id) : undefined}
                        />
                      </Box>
                      {showHeart && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: { xs: "100%", sm: "auto" },
                          }}
                        >
                          <FavoriteIcon sx={{ fontSize: 16, color: "#e11d48" }} />
                        </Box>
                      )}
                    </React.Fragment>
                  );
                })}
              </Box>
            </Box>
          </Stack>
        );
      })}
    </Box>
  );
};
