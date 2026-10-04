import React from "react";
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import WorkOutlineOutlinedIcon from "@mui/icons-material/WorkOutlineOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import AddIcon from "@mui/icons-material/Add";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import { TreeGap, TreeGapType } from "../../services/apiService";
import { AddDobDialog } from "./AddDobDialog";
import { InviteToTreeDialog } from "../FamiliesPage/InviteToTreeDialog";
import { useAuth } from "../hooks/useAuth";
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
 * Each row states the person, what is missing, and the ways to fix it: on wide
 * screens as buttons on the row (fill it in, or invite the person to), on
 * phones as a sheet with everything that person is missing.
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
  { action: string; sheetAction: string; Icon: typeof CakeOutlinedIcon; urgent?: boolean }
> = {
  dob: { action: "Add date", sheetAction: "Add date of birth", Icon: CakeOutlinedIcon, urgent: true },
  photo: { action: "Add photo", sheetAction: "Add photo", Icon: PhotoCameraOutlinedIcon },
  profession: { action: "Add work", sheetAction: "Add profession", Icon: WorkOutlineOutlinedIcon },
};

/** The row's pill buttons: soft blue, hairline border, one height. */
const pillSx = {
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
  textTransform: "none",
  "&:hover": { bgcolor: brand.primarySoft, borderColor: brand.primary },
} as const;

const URGENT_INK = "#e11d48";
const PENDING_INK = "#b45309";

/** First name for button labels: "Invite Ramesh", not "Invite Ramesh Kumar Singh". */
function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "them";
}

/** Invitable at all: never offered for someone who has died. */
function isInvitable(gap: TreeGap): boolean {
  return gap.isAlive !== false;
}

/** Shown but disabled: this person already has an account linked. */
function alreadyOnKinvia(gap: TreeGap): boolean {
  return Boolean(gap.hasAccount);
}

export const TreeGaps: React.FC<TreeGapsProps> = ({
  gaps,
  loading,
  treeName,
  totalIncomplete,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { canEditProfessionProfile } = useAuth();
  /** The person whose birth date is being entered, if any. */
  const [dobTarget, setDobTarget] = React.useState<TreeGap | null>(null);
  /** The person whose options sheet is open (phones). */
  const [sheetTarget, setSheetTarget] = React.useState<TreeGap | null>(null);
  /** The person being invited, if any. */
  const [inviteTarget, setInviteTarget] = React.useState<TreeGap | null>(null);
  /**
   * Rows filled in during this visit.
   *
   * The dashboard's gap list came from one fetch on load, so a row stayed on
   * the worklist after its date was saved until the whole page reloaded — which
   * reads as the save having failed. Dropping it locally is the honest result
   * of what just happened, without re-fetching the page.
   */
  const [resolved, setResolved] = React.useState<Set<string>>(new Set());

  const visibleGaps = gaps.filter((gap) => !resolved.has(`${gap.personId}-${gap.gap}`));
  const isEmpty = !loading && visibleGaps.length === 0;
  const total = Number(totalIncomplete) || 0;

  /** Fill one missing item: a date in place, anything else on the profile. */
  const fixGap = React.useCallback(
    (gap: TreeGap, kind: TreeGapType) => {
      if (kind === "dob") {
        setDobTarget(gap);
        return;
      }
      navigate(`/profile/person/${gap.personId}`);
    },
    [navigate],
  );

  /** Profession is self-service (a career profile speaks for its owner). */
  const missingFor = React.useCallback(
    (gap: TreeGap): TreeGapType[] =>
      (gap.missing?.length ? gap.missing : [gap.gap]).filter(
        (kind) => kind !== "profession" || canEditProfessionProfile(gap.personId),
      ),
    [canEditProfessionProfile],
  );

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
          visibleGaps.map((gap) => {
            const meta = GAP_META[gap.gap] || GAP_META.dob;
            const { Icon } = meta;
            const tint = avatarTint(gap.name || gap.personId);
            const statusInk = meta.urgent ? URGENT_INK : PENDING_INK;

            const identity = (
              <>
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
              </>
            );

            // Phones: the whole row opens the person's sheet — one tap target,
            // nothing nested.
            if (isMobile) {
              return (
                <ButtonBase
                  key={`${gap.personId}-${gap.gap}`}
                  onClick={() => setSheetTarget(gap)}
                  aria-label={`Options for ${gap.name}`}
                  sx={{
                    ...(listRowSx as object),
                    borderRadius: 0,
                    "&:active": { bgcolor: "#f8fafc" },
                  }}
                >
                  {identity}
                  <ArrowForwardIcon aria-hidden sx={{ fontSize: 20, color: brand.primary, flexShrink: 0 }} />
                </ButtonBase>
              );
            }

            // Wide screens: the row is plain, its actions are real buttons.
            return (
              <Box
                key={`${gap.personId}-${gap.gap}`}
                sx={{
                  ...(listRowSx as object),
                  "@media (hover: hover)": { "&:hover": { bgcolor: "#f8fafc" } },
                }}
              >
                {identity}
                {isInvitable(gap) && (
                  <Tooltip title={alreadyOnKinvia(gap) ? `${firstName(gap.name)} is already on Kinvia` : ""}>
                    {/* span: a disabled button can't host the tooltip itself */}
                    <span>
                      <Button
                        size="small"
                        disabled={alreadyOnKinvia(gap)}
                        startIcon={<AddIcon sx={{ fontSize: "16px !important" }} />}
                        onClick={() => setInviteTarget(gap)}
                        aria-label={`Invite ${gap.name} to edit`}
                        sx={{
                          ...pillSx,
                          "& .MuiButton-startIcon": { mr: 0.5 },
                          "&.Mui-disabled": { bgcolor: "#f1f5f9", borderColor: "#e2e8f0", color: brand.slateMuted },
                        }}
                      >
                        Invite to edit
                      </Button>
                    </span>
                  </Tooltip>
                )}
                <Button
                  size="small"
                  onClick={() => fixGap(gap, gap.gap)}
                  aria-label={`${meta.action} for ${gap.name}`}
                  sx={pillSx}
                >
                  {meta.action}
                </Button>
              </Box>
            );
          })}
      </Box>

      {/* Phones: everything this person is missing, plus inviting them. */}
      <Drawer
        anchor="bottom"
        open={Boolean(sheetTarget)}
        onClose={() => setSheetTarget(null)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            pb: "max(12px, env(safe-area-inset-bottom, 0px))",
          },
        }}
      >
        {sheetTarget && (
          <Box role="dialog" aria-label={`Options for ${sheetTarget.name}`}>
            <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: "#cbd5e1", mx: "auto", mt: 1.25, mb: 1 }} />
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2.5, pt: 0.5, pb: 1.5 }}>
              <Avatar
                src={sheetTarget.photoUrl || undefined}
                alt={sheetTarget.name}
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: avatarTint(sheetTarget.name || sheetTarget.personId).bg,
                  color: avatarTint(sheetTarget.name || sheetTarget.personId).fg,
                  fontWeight: 700,
                }}
              >
                {initialsOf(sheetTarget.name) || "?"}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 800, fontSize: 16, color: brand.ink }}>
                  {sheetTarget.name}
                </Typography>
                {(sheetTarget.relation || sheetTarget.nameHindi) && (
                  <Typography noWrap sx={{ fontSize: 13, color: brand.slateMuted }}>
                    {sheetTarget.relation || sheetTarget.nameHindi}
                  </Typography>
                )}
              </Box>
            </Stack>
            <List disablePadding>
              {missingFor(sheetTarget).map((kind) => {
                const m = GAP_META[kind];
                const KindIcon = m.Icon;
                return (
                  <ListItemButton
                    key={kind}
                    onClick={() => {
                      const target = sheetTarget;
                      setSheetTarget(null);
                      fixGap(target, kind);
                    }}
                    sx={{ minHeight: 52, px: 2.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <KindIcon sx={{ color: m.urgent ? URGENT_INK : PENDING_INK }} />
                    </ListItemIcon>
                    <ListItemText primary={m.sheetAction} primaryTypographyProps={{ fontWeight: 600 }} />
                  </ListItemButton>
                );
              })}
              {isInvitable(sheetTarget) && (
                <ListItemButton
                  disabled={alreadyOnKinvia(sheetTarget)}
                  onClick={() => {
                    const target = sheetTarget;
                    setSheetTarget(null);
                    setInviteTarget(target);
                  }}
                  sx={{ minHeight: 52, px: 2.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <PersonAddAlt1OutlinedIcon sx={{ color: brand.primary }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Invite ${firstName(sheetTarget.name)}`}
                    secondary={
                      alreadyOnKinvia(sheetTarget)
                        ? "Already on Kinvia"
                        : "They join as themselves and can fill in their own details"
                    }
                    primaryTypographyProps={{ fontWeight: 700, color: brand.primaryDark }}
                  />
                </ListItemButton>
              )}
              <ListItemButton
                onClick={() => {
                  const target = sheetTarget;
                  setSheetTarget(null);
                  navigate(`/profile/person/${target.personId}`);
                }}
                sx={{ minHeight: 52, px: 2.5 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <AccountCircleOutlinedIcon sx={{ color: brand.slateMuted }} />
                </ListItemIcon>
                <ListItemText primary="Open profile" primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            </List>
          </Box>
        )}
      </Drawer>

      {dobTarget && (
        <AddDobDialog
          open
          onClose={() => setDobTarget(null)}
          personId={dobTarget.personId}
          name={dobTarget.name}
          photoUrl={dobTarget.photoUrl}
          onSaved={(personId) =>
            setResolved((current) => new Set(current).add(`${personId}-dob`))
          }
        />
      )}

      <InviteToTreeDialog
        open={Boolean(inviteTarget)}
        onClose={() => setInviteTarget(null)}
        treeId={inviteTarget?.treeId || ""}
        person={inviteTarget ? { id: inviteTarget.personId, name: inviteTarget.name } : null}
        lockPerson
        allowFullTree={false}
        linkToPerson
      />
    </Box>
  );
};

export default TreeGaps;
