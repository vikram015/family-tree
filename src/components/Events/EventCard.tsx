import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
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
import {
  buildEventShareUrl,
  copyShareLink,
  shareEventNative,
} from "../../utils/shareEvent";

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

const EventCard: React.FC<EventCardProps> = ({
  personId,
  eventType,
  name,
  photoUrl,
  subtitle,
  year,
  onNavigate,
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

  const handleNavigate = () => {
    const path = `/profile/person/${personId}?event=${eventType}&year=${year}`;
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
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
