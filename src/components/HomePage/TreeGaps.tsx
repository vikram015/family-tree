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
import { avatarTint, eyebrowSx, initialsOf, sectionTitleSx } from "./homeTheme";

/**
 * "Complete your tree" worklist.
 *
 * Deliberately rendered unboxed — no Card. The homepage already stacks several
 * panels, and this section only reads as a to-do list (rather than yet another
 * block of content) if it sits directly on the page with hairline dividers.
 */

export interface TreeGapsProps {
  gaps: TreeGap[];
  loading: boolean;
  treeName?: string | null;
  /** Total people in the tree still missing details, for the summary line. */
  incompleteCount?: number;
}

/** Copy + icon per gap kind. The label itself comes from the API. */
const GAP_META: Record<TreeGapType, { action: string; Icon: typeof CakeOutlinedIcon }> = {
  dob: { action: "Add date", Icon: CakeOutlinedIcon },
  photo: { action: "Add photo", Icon: PhotoCameraOutlinedIcon },
  profession: { action: "Add work", Icon: WorkOutlineOutlinedIcon },
};

const ROW_MIN_HEIGHT = 68;

function summaryLine(count: number, treeName?: string | null): string {
  const who = count === 1 ? "1 person" : `${count} people`;
  const verb = count === 1 ? "is" : "are";
  const where = treeName ? ` in ${treeName}` : "";
  return `${who}${where} ${verb} missing details.`;
}

export const TreeGaps: React.FC<TreeGapsProps> = ({
  gaps,
  loading,
  treeName,
  incompleteCount,
}) => {
  const navigate = useNavigate();

  // The list is capped by the API, so the headline count comes from the tree-wide
  // total when the caller has it — the visible rows are only the first few.
  const count = typeof incompleteCount === "number" ? incompleteCount : gaps.length;
  const isEmpty = !loading && gaps.length === 0;

  return (
    <Box component="section">
      <Typography sx={eyebrowSx}>COMPLETE YOUR TREE</Typography>
      <Typography sx={{ ...(sectionTitleSx as object), mt: 0.5 }}>
        {isEmpty ? "Nothing left to fill in" : "A few details are missing"}
      </Typography>

      {!isEmpty && (
        <Typography sx={{ mt: 0.5, fontSize: 14, color: brand.slateMuted }}>
          {loading ? "Looking for gaps in your tree…" : summaryLine(count, treeName)}
        </Typography>
      )}

      <Box sx={{ mt: { xs: 1.5, sm: 2 } }}>
        {loading &&
          [0, 1, 2, 3].map((key) => (
            <Box
              key={key}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                minHeight: ROW_MIN_HEIGHT,
                borderBottom: key === 3 ? "none" : `1px solid ${brand.border}`,
              }}
            >
              <Skeleton variant="circular" width={44} height={44} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton variant="text" width="45%" height={20} />
                <Skeleton variant="text" width="30%" height={16} />
              </Box>
              <Skeleton variant="rounded" width={92} height={36} sx={{ borderRadius: 999 }} />
            </Box>
          ))}

        {isEmpty && (
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ minHeight: ROW_MIN_HEIGHT, py: 1 }}
          >
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
          gaps.map((gap, index) => {
            const meta = GAP_META[gap.gap] || GAP_META.dob;
            const { Icon } = meta;
            const tint = avatarTint(gap.name || gap.personId);
            const isLast = index === gaps.length - 1;

            return (
              // One interactive element per row: the whole row is the button, and
              // the pill on the right is purely visual so nothing nests.
              <ButtonBase
                key={`${gap.personId}-${gap.gap}`}
                onClick={() => navigate(`/profile/person/${gap.personId}`)}
                aria-label={`${meta.action} for ${gap.name}`}
                sx={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1.25, sm: 1.5 },
                  textAlign: "left",
                  minHeight: ROW_MIN_HEIGHT,
                  py: 1.25,
                  borderBottom: isLast ? "none" : `1px solid ${brand.border}`,
                  borderRadius: 0,
                  transition: "background-color 140ms ease",
                  "@media (hover: hover)": {
                    "&:hover": { bgcolor: brand.primarySoft },
                  },
                  "&:active": { bgcolor: brand.primarySoft },
                }}
              >
                <Avatar
                  src={gap.photoUrl || undefined}
                  alt={gap.name}
                  sx={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    bgcolor: tint.bg,
                    color: tint.fg,
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  {initialsOf(gap.name) || "?"}
                </Avatar>

                {/* minWidth:0 lets the long-name ellipsis win over the flex basis. */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    noWrap
                    sx={{ fontWeight: 700, fontSize: { xs: 14.5, sm: 15 }, color: brand.ink }}
                  >
                    {gap.name}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                    <Icon sx={{ fontSize: 15, color: brand.slateMuted, flexShrink: 0 }} />
                    <Typography noWrap sx={{ fontSize: 13, color: brand.slateMuted }}>
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
                    height: 36,
                    borderRadius: 999,
                    border: `1px solid ${brand.primary}`,
                    color: brand.primary,
                    fontSize: 13,
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
