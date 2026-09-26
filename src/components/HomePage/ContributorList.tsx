import React from "react";
import { Avatar, Box, Skeleton, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
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
 * People who have added the most relatives.
 *
 * Previously a rank chip and grey text; it's the one section that is purely
 * about people, so it leads with faces. Only the leader's rank is highlighted —
 * eight identical blue pills would turn a ranking into a wall of badges.
 */

export interface Contributor {
  personName: string;
  peopleAdded: number | string;
  personId?: string | null;
  treeId?: string | null;
  photoUrl?: string | null;
  /**
   * Whether this viewer can actually open the contributor's tree. Set by the
   * server, which knows the viewer's permissions; absent for signed-out callers,
   * who get no contributors at all.
   */
  canView?: boolean;
}

export interface ContributorListProps {
  contributors: Contributor[];
  loading?: boolean;
  /**
   * Rail rendering: smaller avatars and tighter rows, for the narrow column on
   * wide screens. The content is identical — only the density changes.
   */
  compact?: boolean;
}

export const ContributorList: React.FC<ContributorListProps> = ({
  contributors,
  loading = false,
  compact = false,
}) => {
  const navigate = useNavigate();

  const rowSx = compact
    ? { ...(listRowSx as object), px: 1.75, py: 1.25, minHeight: 56, gap: 1.25 }
    : (listRowSx as object);
  const avatarSize = compact ? 34 : 40;

  const open = (item: Contributor) => {
    if (!item.personId) return;
    const params = new URLSearchParams();
    if (item.treeId) params.set("tree", item.treeId);
    params.set("personId", item.personId);
    navigate(`/families?${params.toString()}`);
  };

  return (
    <Box component="section">
      <Typography sx={{ ...(eyebrowSx as object), color: brand.primary }}>Most active</Typography>
      <Typography
        component="h2"
        sx={{ ...(sectionTitleSx as object), mt: 0.5, ...(compact ? { fontSize: 17 } : {}) }}
      >
        Top contributors
      </Typography>
      <Typography
        sx={{
          mt: 0.5,
          mb: { xs: 1.5, sm: 2 },
          fontSize: compact ? 12 : 13.5,
          color: brand.slateMuted,
        }}
      >
        Family members who have added and verified the most relatives.
      </Typography>

      <Box sx={listPanelSx}>
        {loading
          ? [0, 1, 2, 3].map((key) => (
              <Box key={key} sx={rowSx}>
                <Skeleton variant="circular" width={avatarSize} height={avatarSize} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Skeleton variant="text" width="40%" height={20} />
                  <Skeleton variant="text" width="20%" height={16} />
                </Box>
              </Box>
            ))
          : contributors.map((item, index) => {
              const tint = avatarTint(item.personName || String(index));
              const clickable = Boolean(item.personId) && item.canView !== false;
              const isLeader = index === 0;

              return (
                <Box
                  key={`${item.personName}-${index}`}
                  onClick={clickable ? () => open(item) : undefined}
                  sx={{
                    ...rowSx,
                    cursor: clickable ? "pointer" : "default",
                    "@media (hover: hover)": {
                      "&:hover": clickable ? { bgcolor: "#f8fafc" } : undefined,
                    },
                  }}
                >
                  <Avatar
                    src={item.photoUrl || undefined}
                    sx={{
                      width: avatarSize,
                      height: avatarSize,
                      fontSize: compact ? 12 : 13,
                      fontWeight: 700,
                      flexShrink: 0,
                      bgcolor: isLeader ? brand.primarySoft : tint.bg,
                      color: isLeader ? brand.primaryDark : tint.fg,
                      border: isLeader ? "1px solid rgba(191, 219, 254, 0.9)" : "none",
                    }}
                  >
                    {initialsOf(item.personName) || "?"}
                  </Avatar>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                      <Typography
                        noWrap
                        sx={{
                          fontWeight: 700,
                          fontSize: compact ? 13 : 14,
                          color: clickable ? brand.primaryDark : brand.ink,
                        }}
                      >
                        {item.personName}
                      </Typography>
                      {isLeader && (
                        <Typography
                          sx={{
                            flexShrink: 0,
                            px: 0.9,
                            py: 0.25,
                            borderRadius: 0.75,
                            fontSize: 10.5,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            bgcolor: brand.primarySoft,
                            color: brand.primaryDark,
                          }}
                        >
                          Lead contributor
                        </Typography>
                      )}
                    </Stack>
                    <Typography sx={{ fontSize: compact ? 11.5 : 12.5, color: brand.slateMuted }}>
                      {item.peopleAdded} added
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      flexShrink: 0,
                      fontSize: 12,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      ...(isLeader
                        ? {
                            px: 1.25,
                            py: 0.5,
                            borderRadius: 999,
                            bgcolor: brand.primarySoft,
                            border: "1px solid rgba(191, 219, 254, 0.9)",
                            color: brand.primaryDark,
                          }
                        : { color: brand.slateMuted }),
                    }}
                  >
                    #{index + 1}
                  </Typography>
                </Box>
              );
            })}

        {!loading && contributors.length === 0 && (
          <Box sx={rowSx}>
            <Typography sx={{ fontSize: 13.5, color: brand.slateMuted }}>
              No contributor statistics yet.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ContributorList;
