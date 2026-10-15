import React, { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Avatar, Box, Button, ButtonBase, IconButton, Typography } from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";

import type { ProfessionProfileSummary } from "../../store/slices/professionSlice";
import { brand } from "../../theme/brand";
import { avatarTint, initialsOf } from "../HomePage/homeTheme";

/**
 * A person in the profession directory, as the phone design's "Vocations &
 * Expertise" card: avatar, name with one standout badge, their title, a line
 * placing them (family line • where they work), then a tinted strip with the
 * one thing worth knowing and the actions.
 *
 * The avatar is initials, not a photo: the directory is open to strangers and
 * does not send member photos.
 */

export interface ProfessionPersonCardProps {
  person: {
    id: string;
    name: string;
    casteName?: string | null;
    subCasteName?: string | null;
  };
  profile: ProfessionProfileSummary | null;
  /** Vocabulary names, the headline when there is no profile title. */
  professionNames: string[];
  distanceKm?: number;
  canEdit: boolean;
  onEdit: () => void;
}

const GREEN_SOFT = "#E8F5EE";
const GREEN_INK = "#006c4a";
const GREEN_DOT = "#10B981";

/** The summary is rich text; the strip shows its words only. */
function plainText(html?: string | null): string {
  if (!html) return "";
  try {
    return (new DOMParser().parseFromString(html, "text/html").body.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
}

export const ProfessionPersonCard: React.FC<ProfessionPersonCardProps> = ({
  person,
  profile,
  professionNames,
  distanceKm,
  canEdit,
  onEdit,
}) => {
  const tint = avatarTint(person.name || person.id);
  const years = Number(profile?.totalExperienceYears);
  const badge =
    Number.isFinite(years) && years > 0
      ? { label: `${years % 1 === 0 ? years : years.toFixed(1)}y Exp`, green: true }
      : profile?.sector
        ? { label: profile.sector, green: false }
        : null;

  const title = profile?.title
    ? `${profile.title}${profile.subSpecialization ? ` · ${profile.subSpecialization}` : ""}`
    : professionNames.filter(Boolean).join(" · ");

  // Where they work goes on the place line; the strip below then doesn't
  // repeat it.
  const workplace = profile?.organization || profile?.workLocation || null;
  const placeLine = [
    person.subCasteName || person.casteName,
    workplace,
    distanceKm != null && Number.isFinite(distanceKm) ? `${distanceKm} km` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  // The strip says one thing: an offer of help beats a summary, which beats
  // where they are based.
  const highlight = useMemo(() => {
    if (!profile) return { icon: <WorkOutlineOutlinedIcon />, text: "No career profile yet" };
    if (profile.mentorshipAvailable) {
      return { icon: <HandshakeOutlinedIcon />, text: "Offers mentorship to family" };
    }
    const summary = plainText(profile?.summary);
    if (summary) return { icon: <NotesOutlinedIcon />, text: summary };
    if (profile.workLocation && profile.workLocation !== workplace) {
      return { icon: <PlaceOutlinedIcon />, text: `Based in ${profile.workLocation}` };
    }
    // The sector, unless the badge is already showing it.
    if (profile.sector && badge?.label !== profile.sector) {
      return { icon: <WorkOutlineOutlinedIcon />, text: profile.sector };
    }
    return { icon: <WorkOutlineOutlinedIcon />, text: "See their career profile" };
  }, [profile, workplace, badge?.label]);

  const phoneHref = profile?.contactPhone
    ? `tel:${profile.contactPhone.replace(/[^\d+]/g, "")}`
    : null;
  const profileHref = `/profession/${person.id}`;

  return (
    <Box
      sx={{
        // Lets the card shrink to its column in a grid or flex row; without
        // it the one-line name and title set its width instead of truncating.
        minWidth: 0,
        bgcolor: brand.surface,
        borderRadius: 3,
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        border: "1px solid rgba(226, 232, 240, 0.8)",
        boxShadow: "0 4px 16px -4px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.03)",
      }}
    >
      {/* Who they are and what they do — the card's link. */}
      <ButtonBase
        {...(profile
          ? { component: RouterLink, to: profileHref }
          : { component: "div", disabled: true })}
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          gap: 2,
          textAlign: "left",
          borderRadius: 2,
          width: "100%",
        }}
      >
        <Box sx={{ position: "relative", flexShrink: 0 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: tint.bg,
              color: tint.fg,
              fontWeight: 800,
              fontSize: 20,
              boxShadow: "0 1px 3px rgba(15,23,42,0.12)",
            }}
          >
            {initialsOf(person.name)}
          </Avatar>
          {profile?.mentorshipAvailable && (
            <Box
              aria-label="Offers mentorship"
              sx={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: 14,
                height: 14,
                borderRadius: "50%",
                bgcolor: GREEN_DOT,
                boxShadow: `0 0 0 2px ${brand.surface}`,
              }}
            />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0 }}>
            {/* Name and title get two lines before truncating: on a 320px
                phone one line cut most names to their first word. */}
            <Typography
              component="h4"
              sx={{
                fontSize: 19,
                fontWeight: 700,
                lineHeight: 1.3,
                color: brand.ink,
                flex: 1,
                minWidth: 0,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                overflowWrap: "anywhere",
              }}
            >
              {person.name}
            </Typography>
            {badge && (
              <Box
                component="span"
                sx={{
                  flexShrink: 0,
                  maxWidth: "45%",
                  mt: 0.375,
                  px: 1,
                  py: 0.25,
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  bgcolor: badge.green ? GREEN_SOFT : brand.primarySoft,
                  color: badge.green ? GREEN_INK : brand.primary,
                }}
              >
                {badge.label}
              </Box>
            )}
          </Box>
          <Typography
            sx={{
              fontSize: 14.5,
              fontWeight: 600,
              lineHeight: 1.35,
              color: title ? brand.primary : brand.slateMuted,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              overflowWrap: "anywhere",
            }}
          >
            {title || "No profession recorded yet"}
          </Typography>
          {placeLine && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25, color: brand.slateMuted, minWidth: 0 }}>
              <AccountTreeOutlinedIcon sx={{ fontSize: 14, flexShrink: 0 }} />
              <Typography noWrap sx={{ fontSize: 12, minWidth: 0 }}>
                {placeLine}
              </Typography>
            </Box>
          )}
        </Box>
      </ButtonBase>

      {/* One highlight and the actions. */}
      <Box
        sx={{
          bgcolor: "rgba(239, 244, 255, 0.7)",
          borderRadius: 2,
          p: 1.25,
          display: "flex",
          alignItems: "center",
          // The text keeps at least ~140px; with less, the actions drop to a
          // row of their own (right-aligned) rather than squeezing it.
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: "1 1 140px", minWidth: 0 }}>
          <Box sx={{ display: "flex", color: brand.slateMuted, "& svg": { fontSize: 18 }, flexShrink: 0 }}>
            {highlight.icon}
          </Box>
          <Typography
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: 12.5,
              fontWeight: 500,
              color: brand.ink,
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {highlight.text}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto", flexShrink: 0 }}>
          {phoneHref && (
            <IconButton
              component="a"
              href={phoneHref}
              aria-label={`Call ${person.name}`}
              size="small"
              sx={{ width: 32, height: 32, bgcolor: "#e5eeff", color: brand.primary, flexShrink: 0 }}
            >
              <CallOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
          {canEdit && (
            <IconButton
              onClick={onEdit}
              aria-label={profile ? "Edit profession" : "Add profession"}
              size="small"
              sx={{ width: 32, height: 32, bgcolor: "#e5eeff", color: brand.primary, flexShrink: 0 }}
            >
              {profile ? <EditOutlinedIcon sx={{ fontSize: 16 }} /> : <AddIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          )}
          {/* No profile means no profession page to open. */}
          {profile && (
            <Button
              component={RouterLink}
              to={profileHref}
              variant="contained"
              disableElevation
              size="small"
              endIcon={<ArrowForwardIcon sx={{ fontSize: "16px !important" }} />}
              sx={{
                flexShrink: 0,
                height: 32,
                px: 1.5,
                fontSize: 12.5,
                fontWeight: 700,
                textTransform: "none",
                "& .MuiButton-endIcon": { ml: 0.5 },
              }}
            >
              View
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ProfessionPersonCard;
