import React from "react";
import { Avatar, Box, ButtonBase, Skeleton, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { TreeGap, TreeGapType } from "../../services/apiService";
import { brand } from "../../theme/brand";
import {
  avatarTint,
  eyebrowSx,
  initialsOf,
  listPanelSx,
  listRowSx,
  sectionTitleSx,
} from "./homeTheme";

/**
 * "Complete your tree" worklist.
 *
 * The rows sit in a single white card with hairline dividers rather than loose
 * on the page wash: a to-do list needs an edge to read as a queue, and on a long
 * dashboard an unboxed list ran into the section above it.
 *
 * Each row states the person, what is missing, and the one tap that fixes it.
 */

export interface TreeGapsProps {
  gaps: TreeGap[];
  loading: boolean;
  treeName?: string | null;
  /**
   * Tree-wide count of profiles missing something. The visible rows are only
   * the first few (the API caps the list), so the subtitle needs the real total
   * to explain why the list doesn't end.
   */
  totalIncomplete?: number;
}

/**
 * Copy + icon per gap kind. The label itself comes from the API.
 *
 * `urgent` marks the gap a tree loses first — a birth date nobody living
 * remembers is gone, while a missing profession can be filled any time. It only
 * changes the colour of the status line.
 */
const GAP_META: Record<
  TreeGapType,
  { action: string; Icon: typeof CakeOutlinedIcon; urgent?: boolean }
> = {
  dob: { action: "Add date", Icon: CakeOutlinedIcon, urgent: true },
  photo: { action: "Add photo", Icon: PhotoCameraOutlinedIcon },
  profession: { action: "Add work", Icon: WorkOutlineOutlinedIcon },
};

const URGENT_INK = "#e11d48";
const PENDING_INK = "#b45309";

export const TreeGaps: React.FC<TreeGapsProps> = ({
  gaps,
  loading,
  treeName,
  totalIncomplete,
}) => {
  const navigate = useNavigate();

  const isEmpty = !loading && gaps.length === 0;
  const total = Number(totalIncomplete) || 0;

  return (
    // The metric card's "Needs attention" tile links straight here.
    <Box component="section" id="missing-details" sx={{ scrollMarginTop: 88 }}>
      <Typography sx={{ ...(eyebrowSx as object), color: brand.primary }}>
        Complete your tree
      </Typography>
      <Typography component="h2" sx={{ ...(sectionTitleSx as object), mt: 0.5 }}>
        {isEmpty ? "Nothing left to fill in" : "A few details are missing"}
      </Typography>

      {!isEmpty && (
        <Typography sx={{ mt: 0.5, mb: { xs: 1.5, sm: 2 }, fontSize: 13.5, color: brand.slateMuted }}>
          {loading
            ? "Looking for gaps in your tree…"
            : total > gaps.length
              ? `${total} people${treeName ? ` in ${treeName}` : ""} are missing dates, photos or work details. Closest family first.`
              : "Closest family first — each one takes a few seconds."}
        </Typography>
      )}

      <Box sx={{ ...(listPanelSx as object), mt: isEmpty ? { xs: 1.5, sm: 2 } : 0 }}>
        {loading &&
          [0, 1, 2, 3].map((key) => (
            <Box key={key} sx={listRowSx}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton variant="text" width="45%" height={20} />
                <Skeleton variant="text" width="30%" height={16} />
              </Box>
              <Skeleton variant="rounded" width={92} height={32} sx={{ borderRadius: 2 }} />
            </Box>
          ))}

        {isEmpty && (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={listRowSx}>
            <TaskAltIcon sx={{ fontSize: 26, color: brand.accent, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: brand.ink }}>
                Every profile has its details.
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: brand.slateMuted }}>
                {treeName
                  ? `${treeName} is fully filled in — add a relative to keep it growing.`
                  : "Your tree is fully filled in — add a relative to keep it growing."}
              </Typography>
            </Box>
          </Stack>
        )}

        {!loading &&
          gaps.map((gap) => {
            const meta = GAP_META[gap.gap] || GAP_META.dob;
            const { Icon } = meta;
            const tint = avatarTint(gap.name || gap.personId);
            const statusInk = meta.urgent ? URGENT_INK : PENDING_INK;

            return (
              // One interactive element per row: the whole row is the button, and
              // the pill on the right is purely visual so nothing nests.
              <ButtonBase
                key={`${gap.personId}-${gap.gap}`}
                onClick={() => navigate(`/profile/person/${gap.personId}`)}
                aria-label={`${meta.action} for ${gap.name}`}
                sx={{
                  ...(listRowSx as object),
                  borderRadius: 0,
                  "@media (hover: hover)": {
                    "&:hover": { bgcolor: "#f8fafc" },
                  },
                  "&:active": { bgcolor: "#f8fafc" },
                }}
              >
                <Avatar
                  src={gap.photoUrl || undefined}
                  alt={gap.name}
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    bgcolor: tint.bg,
                    color: tint.fg,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {initialsOf(gap.name) || "?"}
                </Avatar>

                {/* minWidth:0 lets the long-name ellipsis win over the flex basis. */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="baseline" sx={{ minWidth: 0 }}>
                    <Typography
                      noWrap
                      sx={{ fontWeight: 700, fontSize: { xs: 14, sm: 14.5 }, color: brand.ink }}
                    >
                      {gap.name}
                    </Typography>
                    {/* "Son of Ram Kumar" — how the family would identify a
                        name the user may not place on its own. Falls back to the
                        Hindi spelling when no parent is recorded. */}
                    {(gap.relation || gap.nameHindi) && (
                      <Typography
                        noWrap
                        sx={{
                          display: { xs: "none", sm: "block" },
                          fontSize: 12,
                          color: brand.slateMuted,
                        }}
                      >
                        · {gap.relation || gap.nameHindi}
                      </Typography>
                    )}
                  </Stack>

                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0, mt: 0.25 }}>
                    <Icon sx={{ fontSize: 14, color: statusInk, flexShrink: 0 }} />
                    <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600, color: statusInk }}>
                      {gap.label}
                    </Typography>
                  </Stack>
                </Box>

                {/* Text pill from `sm` up; on phones the row itself is the tap
                    target, so a chevron is enough and never crowds the name. */}
                <Box
                  aria-hidden
                  sx={{
                    display: { xs: "none", sm: "inline-flex" },
                    alignItems: "center",
                    flexShrink: 0,
                    px: 1.75,
                    height: 32,
                    borderRadius: 2,
                    bgcolor: brand.primarySoft,
                    border: "1px solid rgba(191, 219, 254, 0.9)",
                    color: brand.primaryDark,
                    fontSize: 12.5,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {meta.action}
                </Box>
                <ArrowForwardIcon
                  aria-hidden
                  sx={{
                    display: { xs: "block", sm: "none" },
                    fontSize: 20,
                    color: brand.primary,
                    flexShrink: 0,
                  }}
                />
              </ButtonBase>
            );
          })}
      </Box>
    </Box>
  );
};

export default TreeGaps;
