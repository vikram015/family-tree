import React from "react";
import { Avatar, Box, Skeleton, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { brand } from "../../theme/brand";
import { avatarTint, eyebrowSx, initialsOf, sectionTitleSx } from "./homeTheme";

/**
 * People who have added the most relatives.
 *
 * Previously a rank chip and grey text; it's the one section that is purely
 * about people, so it now leads with faces.
 */

export interface Contributor {
  personName: string;
  peopleAdded: number | string;
  personId?: string | null;
  treeId?: string | null;
  photoUrl?: string | null;
}

export interface ContributorListProps {
  contributors: Contributor[];
  loading?: boolean;
}

export const ContributorList: React.FC<ContributorListProps> = ({
  contributors,
  loading = false,
}) => {
  const navigate = useNavigate();

  const open = (item: Contributor) => {
    if (!item.personId) return;
    const params = new URLSearchParams();
    if (item.treeId) params.set("tree", item.treeId);
    params.set("personId", item.personId);
    navigate(`/families?${params.toString()}`);
  };

  return (
    <Box component="section">
      <Typography sx={{ ...eyebrowSx, mb: 0.5 }}>Most active</Typography>
      <Typography sx={{ ...sectionTitleSx, mb: 0.5 }}>Top contributors</Typography>
      <Typography variant="body2" sx={{ color: brand.slateMuted, mb: 2 }}>
        Family members who have added the most relatives.
      </Typography>

      <Stack spacing={0}>
        {loading
          ? [0, 1, 2, 3].map((key) => (
              <Stack
                key={key}
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ py: 1.25, minHeight: 60 }}
              >
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="text" width="45%" />
              </Stack>
            ))
          : contributors.map((item, index) => {
              const tint = avatarTint(item.personName || String(index));
              const clickable = Boolean(item.personId);
              return (
                <Stack
                  key={`${item.personName}-${index}`}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  onClick={clickable ? () => open(item) : undefined}
                  sx={{
                    py: 1.25,
                    minHeight: 60,
                    borderBottom: index === contributors.length - 1 ? "none" : "1px solid",
                    borderColor: brand.border,
                    cursor: clickable ? "pointer" : "default",
                    "@media (hover: hover)": {
                      "&:hover": clickable ? { bgcolor: "action.hover" } : undefined,
                    },
                  }}
                >
                  <Avatar
                    src={item.photoUrl || undefined}
                    sx={{
                      width: 40,
                      height: 40,
                      fontSize: 14,
                      fontWeight: 700,
                      bgcolor: tint.bg,
                      color: tint.fg,
                      flexShrink: 0,
                    }}
                  >
                    {initialsOf(item.personName) || "?"}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      noWrap
                      sx={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: clickable ? brand.primary : brand.ink,
                      }}
                    >
                      {item.personName}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: brand.slateMuted }}>
                      {item.peopleAdded} added
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: brand.slateMuted,
                      flexShrink: 0,
                    }}
                  >
                    #{index + 1}
                  </Typography>
                </Stack>
              );
            })}

        {!loading && contributors.length === 0 && (
          <Typography variant="body2" sx={{ color: brand.slateMuted }}>
            No contributor statistics yet.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default ContributorList;
