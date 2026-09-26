import React, { useMemo } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { alpha, useTheme } from "@mui/material/styles";

/**
 * Stand-in for a family tree the viewer has no access to.
 *
 * Nothing here comes from the tree: the shapes are generated from its public
 * people count alone, so no name, relationship or photo reaches a browser that
 * is not allowed to have it. What it conveys is scale and "there is something
 * here" — enough to make requesting access feel worth it — with the way out
 * (the access request) sitting on top of it.
 *
 * The layout is seeded from the tree id, so it stays put across re-renders
 * instead of reshuffling under the viewer.
 */

/** Rendering more than this adds nothing and costs layout — a big tree already
 *  reads as big well before it. */
const MAX_RENDERED_NODES = 48;
/** Widest a generation may get before the next people spill into a new row. */
const MAX_GENERATION_WIDTH = 9;

const NODE_W = 56;
const NODE_H = 44;
const GAP_X = 20;
/** Gap between sibling groups — wider than the gap inside one. */
const CLUSTER_GAP_X = 42;
const GAP_Y = 44;
const PADDING = 24;

/** FNV-1a — a stable, cheap string hash for seeding. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — small seeded PRNG, so one tree always draws the same shape. */
function makeRandom(seed: number): () => number {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type PlaceholderNode = { x: number; y: number; gen: number; index: number };

type Layout = {
  nodes: PlaceholderNode[];
  edges: Array<{ from: PlaceholderNode; to: PlaceholderNode }>;
  width: number;
  height: number;
};

/**
 * Distributes `count` people into generations and places them in sibling
 * clusters under their parents.
 *
 * Every knob the shape has — how many ancestors it starts from, how fast each
 * generation grows or thins, how children bunch into clusters, how far a row
 * drifts off centre — is drawn from the seed, so two trees look properly
 * different rather than the same triangle at two sizes.
 */
function buildLayout(count: number, seed: string): Layout {
  const random = makeRandom(hashString(seed));
  const total = Math.max(1, Math.min(count, MAX_RENDERED_NODES));

  // --- Generation sizes -----------------------------------------------------
  const generations: number[] = [];
  let remaining = total;
  // A lone ancestor, a couple, or a pair of siblings and a spouse.
  let size = Math.min(remaining, 1 + Math.round(random() * 2));
  // Depth is capped as well as width. Without it a run of thinning generations
  // walks the tree down the canvas one person at a time, which reads as a chain
  // rather than a family; leftover people simply go undrawn, as they already do
  // past MAX_RENDERED_NODES.
  const maxGenerations = 4 + Math.round(random() * 2);
  while (remaining > 0 && generations.length < maxGenerations) {
    generations.push(size);
    remaining -= size;
    if (remaining <= 0) break;
    // Most generations grow; roughly one in five thins out, the way a family
    // does when a branch has few children. Never below two — a one-person row
    // is where the chain starts.
    const thins = random() < 0.22;
    const next = thins
      ? Math.round(size * (0.55 + random() * 0.3))
      : Math.round(size * (1.15 + random() * 1.45));
    size = Math.min(remaining, Math.max(2, Math.min(next, MAX_GENERATION_WIDTH)));
  }

  // A tree whose generations stayed narrow can hit the depth cap having drawn
  // only a fraction of its people, which would make a large family look small.
  // Widen the younger rows until enough of it is on screen — but only to a
  // threshold, since filling every row to the maximum turns every large tree
  // into the same block. The eldest row is left alone: it is the handful of
  // ancestors everything else descends from.
  const enoughDrawn = Math.ceil(total * 0.7);
  let drawn = generations.reduce((sum, size) => sum + size, 0);
  while (drawn < enoughDrawn) {
    let placed = false;
    for (let gen = generations.length - 1; gen >= 1 && drawn < enoughDrawn; gen -= 1) {
      if (generations[gen] < MAX_GENERATION_WIDTH) {
        generations[gen] += 1;
        drawn += 1;
        placed = true;
      }
    }
    // Every row is as wide as it may get; the rest stay undrawn.
    if (!placed) break;
  }

  // --- Cluster the rows -----------------------------------------------------
  // Siblings sit together with a wider gap between families. Cluster sizes come
  // from the seed too, so the gaps land in different places tree to tree.
  const rows = generations.map((genSize, gen) => {
    const clusters: number[] = [];
    let left = genSize;
    while (left > 0) {
      // The oldest generation is one family; below it, families of 1-4.
      const clusterSize = gen === 0 ? left : Math.min(left, 1 + Math.round(random() * 3));
      clusters.push(clusterSize);
      left -= clusterSize;
    }
    return clusters;
  });

  const rowWidth = (clusters: number[]) => {
    const people = clusters.reduce((sum, c) => sum + c, 0);
    return (
      people * NODE_W +
      (people - clusters.length) * GAP_X +
      (clusters.length - 1) * CLUSTER_GAP_X
    );
  };

  const widest = Math.max(...rows.map(rowWidth));
  const width = widest + PADDING * 2;
  const height =
    generations.length * NODE_H + (generations.length - 1) * GAP_Y + PADDING * 2;

  // --- Place the nodes ------------------------------------------------------
  const nodes: PlaceholderNode[] = [];
  const byGeneration: PlaceholderNode[][] = [];
  const clusterHeads: number[][] = [];

  rows.forEach((clusters, gen) => {
    const thisWidth = rowWidth(clusters);
    // Rows drift off centre by up to a node's width, within the canvas, so the
    // tree leans instead of sitting in a perfect column.
    const slack = Math.max(0, width - PADDING * 2 - thisWidth);
    const drift = (random() - 0.5) * Math.min(slack, NODE_W * 1.5);
    let x = PADDING + (width - PADDING * 2 - thisWidth) / 2 + drift;
    const y = PADDING + gen * (NODE_H + GAP_Y);

    const row: PlaceholderNode[] = [];
    const heads: number[] = [];

    clusters.forEach((clusterSize) => {
      heads.push(row.length);
      for (let i = 0; i < clusterSize; i += 1) {
        // ±6px of wobble keeps the rows from reading as a perfect grid.
        const jitter = (random() - 0.5) * 12;
        row.push({ x: x + jitter, y, gen, index: row.length });
        x += NODE_W + GAP_X;
      }
      x += CLUSTER_GAP_X - GAP_X;
    });

    row.forEach((node) => nodes.push(node));
    byGeneration.push(row);
    clusterHeads.push(heads);
  });

  // --- Connect the generations ---------------------------------------------
  const edges: Array<{ from: PlaceholderNode; to: PlaceholderNode }> = [];
  for (let gen = 1; gen < byGeneration.length; gen += 1) {
    const parents = byGeneration[gen - 1];
    const children = byGeneration[gen];
    const heads = clusterHeads[gen];

    // One family per cluster: every child in a cluster hangs off the same
    // parent, and clusters spread across the generation above.
    heads.forEach((head, clusterIndex) => {
      const parentIndex = Math.min(
        parents.length - 1,
        Math.floor((clusterIndex * parents.length) / heads.length),
      );
      const clusterEnd = clusterIndex + 1 < heads.length ? heads[clusterIndex + 1] : children.length;
      for (let i = head; i < clusterEnd; i += 1) {
        edges.push({ from: parents[parentIndex], to: children[i] });
      }
    });
  }

  return { nodes, edges, width, height };
}

export interface LockedTreePreviewProps {
  /** Public people count for the tree — the only real input to the drawing. */
  peopleCount: number;
  /** Tree id, used purely as the layout seed. */
  seed: string;
  /** Label for the access action — "Request access…", "Request pending",
   *  "Sign in to request". Derived by the page, which owns the request state. */
  requestLabel: string;
  requestDisabled?: boolean;
  onRequestAccess: () => void;
}

export const LockedTreePreview: React.FC<LockedTreePreviewProps> = ({
  peopleCount,
  seed,
  requestLabel,
  requestDisabled,
  onRequestAccess,
}) => {
  const theme = useTheme();
  const layout = useMemo(() => buildLayout(peopleCount, seed), [peopleCount, seed]);

  const cardFill = theme.palette.background.paper;
  // Weighted to survive the blur: too faint and the whole thing reads as a
  // smudge or a failed load rather than a tree behind frosted glass.
  const cardStroke = alpha(theme.palette.text.primary, 0.24);
  const barFill = alpha(theme.palette.text.primary, 0.26);
  const avatarFill = alpha(theme.palette.primary.main, 0.45);
  const edgeStroke = alpha(theme.palette.text.primary, 0.34);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        px: 2,
        py: 3,
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          // Enough that nothing resolves into a readable shape, not so much
          // that the tree stops reading as a tree. Scaled up so the blur's soft
          // edge falls outside the frame.
          filter: "blur(4px)",
          transform: "scale(1.04)",
          opacity: 0.9,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <Box
          component="svg"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          preserveAspectRatio="xMidYMid meet"
          sx={{ width: "100%", height: "100%", maxWidth: 900 }}
        >
          <g stroke={edgeStroke} strokeWidth={2} fill="none">
            {layout.edges.map(({ from, to }, i) => {
              const startX = from.x + NODE_W / 2;
              const startY = from.y + NODE_H;
              const endX = to.x + NODE_W / 2;
              const endY = to.y;
              const midY = startY + (endY - startY) / 2;
              return (
                <path key={i} d={`M${startX} ${startY} V${midY} H${endX} V${endY}`} />
              );
            })}
          </g>

          {layout.nodes.map((node, i) => (
            <g key={i}>
              <rect
                x={node.x}
                y={node.y}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill={cardFill}
                stroke={cardStroke}
                strokeWidth={1.4}
              />
              <circle cx={node.x + 14} cy={node.y + 15} r={7} fill={avatarFill} />
              <rect
                x={node.x + 26}
                y={node.y + 11}
                width={NODE_W - 34}
                height={5}
                rx={2.5}
                fill={barFill}
              />
              <rect
                x={node.x + 10}
                y={node.y + 29}
                width={NODE_W - 20}
                height={5}
                rx={2.5}
                fill={barFill}
              />
            </g>
          ))}
        </Box>
      </Box>

      <Stack
        alignItems="center"
        spacing={0.75}
        sx={{
          position: "relative",
          textAlign: "center",
          maxWidth: 420,
          px: 2.5,
          py: 2,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: alpha(theme.palette.background.paper, 0.92),
          backdropFilter: "blur(2px)",
        }}
      >
        <LockOutlinedIcon sx={{ color: "text.secondary" }} />
        <Typography sx={{ fontWeight: 700 }}>
          {peopleCount > 0
            ? `${peopleCount} ${peopleCount === 1 ? "person" : "people"} in this family`
            : "This family tree is private"}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          You don't have access to this tree, so its members stay hidden.
        </Typography>
        {/* The page's banner carries the same action; this is the one that lands
            where the viewer is already looking. */}
        <Button
          variant="contained"
          disabled={requestDisabled}
          onClick={onRequestAccess}
          sx={{ mt: 0.5, minHeight: 44, fontWeight: 700, textTransform: "none" }}
        >
          {requestLabel}
        </Button>
      </Stack>
    </Box>
  );
};

export default LockedTreePreview;
