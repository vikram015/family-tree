import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import FavoriteIcon from "@mui/icons-material/Favorite";
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import type { WishEventType } from "../../services/apiService";
import { brand } from "../../theme/brand";
import { memorialSurface } from "../HomePage/homeTheme";
import {
  buildEventShareUrl,
  copyShareLink,
  shareEventNative,
} from "../../utils/shareEvent";

/**
 * `compact` is the original card — avatar, chip, one line of context — used
 * wherever events appear in a scrolling strip.
 *
 * `feature` is the dashboard's "Today in your family" card: the same event, the
 * same actions, but laid out to carry them as labelled buttons rather than a
 * lone icon. Both share every behaviour below (open the wish thread, native
 * share with a copy-link fallback), so there is one place where an event card's
 * actions are defined.
 */
export type EventCardVariant = "compact" | "feature";

export interface EventCardProps {
  personId: string;
  eventType: WishEventType;
  name: string;
  photoUrl?: string | null;
  /** e.g. "Turns 40 today 🎂" / "25 years together 💍" / "Remembered — 3 years ago 🕊️" */
  subtitle: string;
  year: number;
  /** Optional navigation override; defaults to react-router useNavigate. */
  onNavigate?: (path: string) => void;
  /**
   * Handle the wish in place instead of navigating to the profile thread.
   * Supplied by the dashboard, which opens a compose dialog; everywhere else
   * the card keeps its normal navigation.
   */
  onSendWish?: (target: {
    personId: string;
    name: string;
    photoUrl?: string | null;
    eventType: WishEventType;
    year: number;
  }) => void;
  variant?: EventCardVariant;
  /** Feature variant: the pill above the name, e.g. "56th remembrance". */
  tag?: string;
  /** Feature variant: lifespan or event date shown opposite the tag. */
  dateLabel?: string;
  /** Feature variant: enables the "Inspect in tree" link when known. */
  treeId?: string | null;
}

type EventStyle = {
  Icon: React.ElementType;
  label: string;
  emoji: string;
  color: string;
  soft: string;
};

const EVENT_STYLES: Record<WishEventType, EventStyle> = {
  birthday: {
    Icon: CakeOutlinedIcon,
    label: "Birthday",
    emoji: "🎂",
    color: brand.primary,
    soft: brand.primarySoft,
  },
  anniversary: {
    Icon: FavoriteIcon,
    label: "Anniversary",
    emoji: "💍",
    color: brand.accent,
    soft: brand.accentSoft,
  },
  remembrance: {
    Icon: LocalFloristIcon,
    label: "Remembrance",
    emoji: "🕊️",
    color: brand.slate,
    soft: "rgba(71, 85, 105, 0.10)",
  },
};

function buildShareMessage(
  eventType: WishEventType,
  name: string,
): { title: string; text: string } {
  switch (eventType) {
    case "birthday":
      return {
        title: `Happy Birthday, ${name}! 🎂`,
        text: `Wish ${name} a happy birthday! 🎂`,
      };
    case "anniversary":
      return {
        title: `Happy Anniversary — ${name} 💍`,
        text: `Celebrate ${name}'s anniversary! 💍`,
      };
    case "remembrance":
    default:
      return {
        title: `Remembering ${name} 🕊️`,
        text: `Join the family in remembering ${name}. 🕊️`,
      };
  }
}

/**
 * Feature-variant accents, one per event type.
 *
 * Deliberately not `EVENT_STYLES`: in the compact card the chip sits on white,
 * while here the whole card is tinted and needs a matching border and button
 * ink. A remembrance reads as gold, a birthday as rose, an anniversary as blue.
 */
const FEATURE_TONES: Record<
  WishEventType,
  { ink: string; soft: string; border: string; surface: string; action: string }
> = {
  birthday: {
    ink: "#be123c",
    soft: "#ffe4e6",
    // rose-200/80
    border: "rgba(254, 205, 211, 0.8)",
    // The design's `bg-gradient-to-br from-rose-50/70 via-white to-emerald-50/40`.
    // The third stop really is emerald, not more rose — it keeps the card from
    // reading as a warning and is why it looks alive rather than tinted.
    surface:
      "linear-gradient(135deg, rgba(255, 241, 242, 0.7) 0%, #ffffff 50%, rgba(236, 253, 245, 0.4) 100%)",
    action: "#e11d48",
  },
  anniversary: {
    ink: "#1d4ed8",
    soft: brand.primarySoft,
    // blue-200
    border: "#bfdbfe",
    // `bg-gradient-to-br from-blue-50/70 via-white to-sky-50/50`
    surface:
      "linear-gradient(135deg, rgba(239, 246, 255, 0.7) 0%, #ffffff 50%, rgba(240, 249, 255, 0.5) 100%)",
    action: brand.primary,
  },
  remembrance: {
    ink: "#92400e",
    soft: "#fef3c7",
    // amber-200/80
    border: "rgba(253, 230, 138, 0.8)",
    // The same gold the panel uses — in the design the remembrance card and its
    // container share one gradient rather than two near-identical ones.
    surface: memorialSurface,
    action: "#b45309",
  },
};

/** What the primary button says — all three post to the same wish thread. */
const FEATURE_ACTION_LABEL: Record<WishEventType, string> = {
  birthday: "Send wishes",
  anniversary: "Send wishes",
  remembrance: "Light candle",
};

/** The small underlined links under a feature card's name. */
const linkSx = (color: string) => ({
  border: 0,
  p: 0,
  bgcolor: "transparent",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  color,
  textDecoration: "underline",
  textUnderlineOffset: 2,
});

const EventCard: React.FC<EventCardProps> = ({
  personId,
  eventType,
  name,
  photoUrl,
  subtitle,
  year,
  onNavigate,
  variant = "compact",
  tag,
  dateLabel,
  treeId,
  onSendWish,
}) => {
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState("");

  const style = EVENT_STYLES[eventType] ?? EVENT_STYLES.birthday;
  const { Icon } = style;

  const shareUrl = useMemo(
    () => buildEventShareUrl(personId, eventType, year, photoUrl),
    [personId, eventType, year, photoUrl],
  );
  const { title, text } = useMemo(
    () => buildShareMessage(eventType, name),
    [eventType, name],
  );

  // Mobile / supported browsers use the OS share sheet; desktop copies the link.
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  /**
   * Where the celebration lives for this card.
   *
   * The person/occasion form rather than an event id: the card has no id to
   * hand out, and the event may never have been opened before. The celebration
   * page resolves it (creating it if needed) and replaces the URL with the
   * canonical one.
   */
  const celebrationPath =
    `/celebration?personId=${encodeURIComponent(personId)}` +
    `&eventType=${encodeURIComponent(eventType)}&eventYear=${year}`;

  /**
   * The card's primary action: open the celebration.
   *
   * `onSendWish`, when a surface supplies it, handles the wish in place instead
   * — the dashboard opens a compose dialog rather than sending the user to a
   * whole page for one sentence. Every other surface navigates to the
   * celebration, which is now where a wish lives.
   *
   * The person/occasion form rather than an event id: the event may not have
   * been materialized yet, and this is exactly the request that brings it into
   * existence. The page swaps itself for the canonical `/celebration/:id` once
   * the server answers.
   */
  const handleNavigate = () => {
    if (onSendWish) {
      onSendWish({ personId, name, photoUrl, eventType, year });
      return;
    }
    if (onNavigate) {
      onNavigate(celebrationPath);
    } else {
      navigate(celebrationPath);
    }
  };

  const handleShare = async (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (canNativeShare) {
      await shareEventNative({ title, text, url: shareUrl });
      return;
    }
    const copied = await copyShareLink(shareUrl);
    setSnackbar(copied ? "Link copied to clipboard" : "Couldn't copy the link");
  };

  if (variant === "feature") {
    const feature = FEATURE_TONES[eventType] ?? FEATURE_TONES.birthday;

    const go = (path: string) => {
      if (onNavigate) onNavigate(path);
      else navigate(path);
    };

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          p: { xs: 1.75, sm: 2 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: feature.border,
          background: feature.surface,
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1.25 }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.4,
              borderRadius: 1,
              bgcolor: feature.soft,
              color: feature.ink,
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            <Icon sx={{ fontSize: 13 }} />
            {tag || `${style.label} ${style.emoji}`}
          </Box>
          {dateLabel && (
            <Typography
              noWrap
              sx={{ fontSize: 11, fontWeight: 600, color: brand.slateMuted, flexShrink: 0 }}
            >
              {dateLabel}
            </Typography>
          )}
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ minWidth: 0 }}>
          <Avatar
            src={photoUrl || undefined}
            alt={name}
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              bgcolor: feature.soft,
              color: feature.ink,
              fontWeight: 700,
            }}
          >
            {name ? name.charAt(0).toUpperCase() : <Icon />}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              noWrap
              title={name}
              sx={{ fontWeight: 700, fontSize: 15, color: brand.ink, lineHeight: 1.3 }}
            >
              {name}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: brand.slate, lineHeight: 1.4 }}>
              {subtitle}
            </Typography>
          </Box>
        </Stack>

        {/* Two ways out of the card, beneath the name.

            The primary button sends a wish in a dialog — the fast path, for
            people who only want to say one sentence. These are the slower
            ones: the celebration itself, where the whole wall lives, and the
            tree. The celebration leads, because on a birthday card it is the
            more natural destination and it is otherwise reachable from
            nowhere. */}
        <Stack direction="row" spacing={1.5} sx={{ mt: 1.25, mb: 1.75 }}>
          <Typography
            component="button"
            type="button"
            onClick={() => go(celebrationPath)}
            sx={linkSx(feature.ink)}
          >
            Open celebration
          </Typography>
          <Typography
            component="button"
            type="button"
            onClick={() =>
              go(
                treeId
                  ? `/families?tree=${treeId}&personId=${personId}`
                  : `/families?personId=${personId}`,
              )
            }
            sx={linkSx(brand.slateMuted)}
          >
            In tree
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: "auto" }}>
          <Button
            size="small"
            variant="contained"
            disableElevation
            onClick={handleNavigate}
            sx={{
              // No leading icon: the tag above already carries it, and at two
              // buttons to a 260px card the label needs every pixel.
              flex: 1,
              minWidth: 0,
              px: 1,
              minHeight: 36,
              fontSize: 12.5,
              fontWeight: 700,
              borderRadius: 2,
              // The theme uppercases buttons app-wide; these carry names and
              // verbs that read as shouting in caps, and wrap to two lines in a
              // 280px card.
              textTransform: "none",
              whiteSpace: "nowrap",
              bgcolor: feature.action,
              "&:hover": { bgcolor: feature.ink },
            }}
          >
            {FEATURE_ACTION_LABEL[eventType]}
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleShare}
            startIcon={
              canNativeShare ? (
                <ShareOutlinedIcon sx={{ fontSize: 16 }} />
              ) : (
                <ContentCopyIcon sx={{ fontSize: 16 }} />
              )
            }
            sx={{
              flex: 1,
              minWidth: 0,
              px: 1,
              minHeight: 36,
              fontSize: 12.5,
              fontWeight: 600,
              borderRadius: 2,
              textTransform: "none",
              whiteSpace: "nowrap",
              color: brand.slate,
              borderColor: brand.border,
              bgcolor: brand.surface,
              "&:hover": { borderColor: "#cbd5e1", bgcolor: brand.canvas },
            }}
          >
            {canNativeShare ? "Share" : "Copy link"}
          </Button>
        </Stack>

        <Snackbar
          open={Boolean(snackbar)}
          autoHideDuration={2500}
          onClose={() => setSnackbar("")}
          message={snackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        />
      </Box>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        borderColor: "divider",
        height: "100%",
        position: "relative",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        "&:hover": { boxShadow: 4, transform: "translateY(-2px)" },
      }}
    >
      <CardActionArea
        onClick={handleNavigate}
        sx={{ p: 2, borderRadius: 3, alignItems: "stretch" }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={photoUrl || undefined}
            alt={name}
            sx={{
              width: 52,
              height: 52,
              bgcolor: style.soft,
              color: style.color,
              fontWeight: 700,
            }}
          >
            {name ? name.charAt(0).toUpperCase() : <Icon />}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1, pr: 4 }}>
            <Chip
              size="small"
              icon={<Icon sx={{ fontSize: 16, color: `${style.color} !important` }} />}
              label={`${style.label} ${style.emoji}`}
              sx={{
                mb: 0.5,
                bgcolor: style.soft,
                color: style.color,
                fontWeight: 600,
                height: 22,
                "& .MuiChip-label": { px: 0.75, fontSize: 12 },
              }}
            />
            <Typography
              variant="subtitle1"
              noWrap
              sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.2 }}
              title={name}
            >
              {name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap title={subtitle}>
              {subtitle}
            </Typography>
          </Box>
        </Stack>
      </CardActionArea>

      <Tooltip title={canNativeShare ? "Share" : "Copy link"}>
        <IconButton
          size="small"
          onClick={handleShare}
          aria-label={canNativeShare ? "Share event" : "Copy event link"}
          sx={{ position: "absolute", top: 8, right: 8, color: "text.secondary" }}
        >
          {canNativeShare ? (
            <ShareOutlinedIcon fontSize="small" />
          ) : (
            <ContentCopyIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={2500}
        onClose={() => setSnackbar("")}
        message={snackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Card>
  );
};

export default EventCard;
