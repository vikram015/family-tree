import React, { useEffect, useState } from "react";
import { Avatar, Box, Skeleton, Stack, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { ApiService, RecentWish } from "../../services/apiService";
import { brand } from "../../theme/brand";
import { avatarTint, eyebrowSx, initialsOf, listPanelSx, sectionTitleSx } from "./homeTheme";

/**
 * The family's wall of wishes: who has been writing to whom.
 *
 * The contributor ranking answers "who edits the tree most", which is a
 * maintenance statistic. This answers the warmer question next to it — what
 * people actually said to each other — so the two sit together at the foot of
 * the dashboard rather than the numbers standing alone.
 *
 * Scoped server-side to the viewer's own family, and empty for a signed-out
 * visitor. A wall with nothing on it renders nothing at all: an empty panel
 * headed "Recent wishes" is worse than the space it occupies.
 */

/**
 * The message's type metrics, in one place.
 *
 * The heart is centred on the first line of the message by giving its box
 * exactly one line's height. It used to carry a hardcoded `mt: "2px"`, which
 * was a guess at half the leading and sat visibly high against a 20.25px line.
 */
const MESSAGE_FONT_SIZE = 13.5;
const MESSAGE_LINE_HEIGHT = 1.5;

const EVENT_VERB: Record<string, string> = {
  birthday: "wished",
  anniversary: "congratulated",
  remembrance: "remembered",
};

/** "3 days ago" — precise enough for a wall, and needs no date library. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export interface WishWallProps {
  /** Bumped by the dashboard when a wish is sent, to re-read the wall. */
  refreshKey?: number;
}

export const WishWall: React.FC<WishWallProps> = ({ refreshKey = 0 }) => {
  const [wishes, setWishes] = useState<RecentWish[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    ApiService.getRecentWishes(12)
      .then((rows) => {
        if (active) setWishes(rows || []);
      })
      .catch((error) => {
        // Non-fatal: the wall is an extra, and the rest of the dashboard is
        // more important than reporting that it could not load.
        console.warn("Could not load recent wishes:", error);
        if (active) setWishes([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <Box component="section">
        <Typography sx={{ ...(eyebrowSx as object), color: brand.primary }}>
          From the family
        </Typography>
        <Typography component="h2" sx={{ ...(sectionTitleSx as object), mt: 0.5, mb: 2 }}>
          Recent wishes
        </Typography>
        <Box sx={listPanelSx}>
          {[0, 1, 2].map((key) => (
            <Stack key={key} direction="row" spacing={1.5} sx={{ p: 2 }}>
              <Skeleton variant="circular" width={36} height={36} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="55%" height={18} />
                <Skeleton variant="text" width="80%" height={16} />
              </Box>
            </Stack>
          ))}
        </Box>
      </Box>
    );
  }

  // Nothing written yet is not worth a panel saying so.
  if (!wishes || wishes.length === 0) return null;

  return (
    <Box component="section">
      <Typography sx={{ ...(eyebrowSx as object), color: brand.primary }}>
        From the family
      </Typography>
      <Typography component="h2" sx={{ ...(sectionTitleSx as object), mt: 0.5 }}>
        Recent wishes
      </Typography>
      <Typography
        sx={{ mt: 0.5, mb: { xs: 1.5, sm: 2 }, fontSize: 13.5, color: brand.slateMuted }}
      >
        What people have been saying to each other lately.
      </Typography>

      <Box sx={listPanelSx}>
        {wishes.map((wish) => {
          const author = wish.authorName || "Someone";
          const recipient = wish.personName || "a relative";
          const tint = avatarTint(author);

          return (
            <Stack
              key={wish.id}
              direction="row"
              spacing={1.5}
              sx={{
                p: { xs: 1.75, sm: 2 },
                alignItems: "flex-start",
                borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
                "&:last-of-type": { borderBottom: "none" },
              }}
            >
              <Avatar
                src={wish.authorPhotoUrl || undefined}
                alt={author}
                sx={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  bgcolor: tint.bg,
                  color: tint.fg,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {initialsOf(author) || "?"}
              </Avatar>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 13.5, color: brand.slate, lineHeight: 1.5 }}>
                  <Box component="span" sx={{ fontWeight: 700, color: brand.ink }}>
                    {author}
                  </Box>{" "}
                  {EVENT_VERB[wish.eventType] || "wrote to"}{" "}
                  {/* The recipient is the useful link: the wall is a way in,
                      not a read-only feed. It leads to the celebration the
                      message was written on, where the rest of the messages
                      are — the person's profile only had the one. Wishes
                      predating events still fall back to the profile. */}
                  <Box
                    component={Link}
                    to={
                      wish.eventId
                        ? `/celebration/${wish.eventId}`
                        : `/profile/person/${wish.peopleId}`
                    }
                    sx={{
                      fontWeight: 700,
                      color: brand.primaryDark,
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    {recipient}
                  </Box>
                  <Box component="span" sx={{ color: brand.slateMuted }}>
                    {" "}
                    · {timeAgo(wish.createdAt)}
                  </Box>
                </Typography>

                {wish.message && (
                  <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }} alignItems="flex-start">
                    {/* One line tall and centred within it, so the heart sits on
                        the first line of the message however long the message
                        runs. */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        height: `${MESSAGE_FONT_SIZE * MESSAGE_LINE_HEIGHT}px`,
                        flexShrink: 0,
                      }}
                    >
                      <FavoriteIcon sx={{ fontSize: 14, color: brand.primary }} />
                    </Box>
                    <Typography
                      sx={{
                        fontSize: MESSAGE_FONT_SIZE,
                        color: brand.ink,
                        lineHeight: MESSAGE_LINE_HEIGHT,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {wish.message}
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Stack>
          );
        })}
      </Box>
    </Box>
  );
};

export default WishWall;
