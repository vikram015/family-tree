import React from "react";
import { Avatar, Box, Chip, Paper, Stack, Typography } from "@mui/material";
import type { FNode } from "../../model/FNode";
import { formatDisplayDate } from "../../../utils/dateFormatter";
import { brand } from "../../../theme/brand";

const DEVANAGARI_REGEX = /[ऀ-ॿ]/;

/** Initials from an English name source (first + last word), else "?". */
function getInitials(node: FNode): string {
  const candidates = [
    (node as any).nameEnglish,
    node.name,
    (node as any).preferredName,
  ];
  const source =
    candidates
      .map((s) => (s ? String(s).trim() : ""))
      .find((s) => s && !DEVANAGARI_REGEX.test(s)) ||
    (node.name || "").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] || "" : "";
  return (first + last).toUpperCase() || "?";
}

const TINTS = {
  male: { bg: "#eff6ff", border: "#bfdbfe", avatarBg: "#dbeafe", avatarFg: "#1d4ed8" },
  female: { bg: "#fff1f5", border: "#fbcfe8", avatarBg: "#fce7f3", avatarFg: "#be185d" },
  other: { bg: brand.canvas, border: brand.border, avatarBg: brand.border, avatarFg: brand.slate },
};

interface PersonTimelineCardProps {
  node: FNode;
  isYou?: boolean;
  onClick?: (node: FNode) => void;
}

export const PersonTimelineCard: React.FC<PersonTimelineCardProps> = ({
  node,
  isYou = false,
  onClick,
}) => {
  const gender = (node as any).gender;
  const tint = gender === "male" ? TINTS.male : gender === "female" ? TINTS.female : TINTS.other;
  const deceased = node.isAlive === false || Boolean(node.deceasedDate);

  const hindiName = node.nameHindi?.trim();
  const englishName = node.name?.trim() || "Unknown";
  const primary = hindiName || englishName;
  const secondary = hindiName ? englishName : undefined;
  const dob = node.dob ? formatDisplayDate(node.dob) : "DOB unavailable";

  return (
    <Paper
      elevation={0}
      onClick={onClick ? () => onClick(node) : undefined}
      sx={{
        p: 1.25,
        borderRadius: 2.5,
        border: "1.5px solid",
        borderColor: isYou ? "#f59e0b" : tint.border,
        backgroundColor: isYou ? "#fffbeb" : tint.bg,
        cursor: onClick ? "pointer" : "default",
        opacity: deceased ? 0.85 : 1,
        transition: "box-shadow 0.15s ease, transform 0.15s ease",
        "&:hover": onClick ? { boxShadow: 3, transform: "translateY(-1px)" } : undefined,
        width: "100%",
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Avatar
          src={node.photo || undefined}
          sx={{
            width: 60,
            height: 60,
            bgcolor: tint.avatarBg,
            color: tint.avatarFg,
            fontWeight: 700,
            fontSize: 20,
          }}
        >
          {getInitials(node)}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {primary}
            </Typography>
            {isYou && <Chip label="You" size="small" color="warning" sx={{ height: 18, fontSize: 10 }} />}
            {deceased && (
              <Box component="span" title="Deceased" sx={{ color: "#c2410c", fontSize: 13, lineHeight: 1 }}>
                ॐ
              </Box>
            )}
          </Stack>
          {/* Always render this line (nbsp when empty) so cards keep equal height. */}
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {secondary || " "}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.disabled", display: "block" }}>
            {dob}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
};
