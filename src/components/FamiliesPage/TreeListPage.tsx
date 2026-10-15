import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useNavigationType } from "react-router-dom";
import {
  Alert,
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Chip,
  Fab,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import LoginIcon from "@mui/icons-material/Login";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import SearchIcon from "@mui/icons-material/Search";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import AddTree from "../AddTree/AddTree";
import { useAuth } from "../hooks/useAuth";
import { ApiService, type MyTree } from "../../services/apiService";
import { brand } from "../../theme/brand";
import { timeAgo } from "../CelebrationPage/celebrationTheme";

/**
 * The phone's Families tab: every tree you can open, as cards. Tapping one
 * opens it full screen, where the tree gets the whole display — no app header,
 * no tab bar — and a back arrow returns here.
 *
 * Desktop never sees this page; it has room for the tree and a picker at once.
 */

type AccessFilter = "all" | "edit" | "view";

const ACCESS_LABEL: Record<MyTree["access"], { label: string; icon: React.ReactElement }> = {
  owner: { label: "Owner", icon: <ShieldOutlinedIcon /> },
  admin: { label: "Admin", icon: <ShieldOutlinedIcon /> },
  editor: { label: "Editor", icon: <EditNoteOutlinedIcon /> },
  branch: { label: "Branch editor", icon: <EditNoteOutlinedIcon /> },
  viewer: { label: "Viewer", icon: <VisibilityOutlinedIcon /> },
};

const canEdit = (tree: MyTree) => tree.access !== "viewer";

/**
 * Kept between visits so coming Back from a tree shows the list at once, then
 * refreshes underneath, instead of flashing skeletons on every return.
 */
let cachedTrees: MyTree[] | null = null;

/** Where the list was scrolled when a tree was opened, for coming Back to it. */
let savedScrollTop: number | null = null;

/** The element that actually scrolls this page (the app shell, not the window). */
function scrollParentOf(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current) {
    const { overflowY } = window.getComputedStyle(current);
    if (overflowY === "auto" || overflowY === "scroll") return current;
    current = current.parentElement;
  }
  return null;
}

function placeLine(tree: MyTree): string {
  const lineage = [tree.subCasteName, tree.casteName].filter(Boolean).join(", ");
  const place = [tree.locationName, tree.districtName].filter(Boolean).join(", ");
  return [lineage, place].filter(Boolean).join(" • ");
}

function countLabel(n: number, one: string, many: string): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

const AccessBadge: React.FC<{ access: MyTree["access"]; strong?: boolean }> = ({
  access,
  strong,
}) => {
  const { label, icon } = ACCESS_LABEL[access];
  return (
    <Chip
      size="small"
      icon={icon}
      label={label}
      sx={{
        height: 22,
        fontSize: 11.5,
        fontWeight: 700,
        "& .MuiChip-icon": { fontSize: 14, ml: 0.75, color: "inherit" },
        ...(strong
          ? { bgcolor: brand.primary, color: "#fff" }
          : { bgcolor: brand.canvas, color: brand.slate, border: `1px solid ${brand.border}` }),
      }}
    />
  );
};

const TreeCard: React.FC<{ tree: MyTree; onOpen: (tree: MyTree) => void }> = ({
  tree,
  onOpen,
}) => {
  const place = placeLine(tree);
  const updated = tree.updatedAt ? timeAgo(tree.updatedAt) : "";
  const members = countLabel(tree.peopleCount, "member", "members");
  const generations =
    tree.generations > 0 ? countLabel(tree.generations, "generation", "generations") : "";

  return (
    <Paper
      elevation={0}
      role="link"
      tabIndex={0}
      aria-label={`Open ${tree.name}`}
      onClick={() => onOpen(tree)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(tree);
        }
      }}
      sx={{
        position: "relative",
        overflow: "hidden",
        p: 2,
        borderRadius: 3,
        cursor: "pointer",
        bgcolor: brand.surface,
        border: `1px solid ${tree.isPrimary ? "rgba(13,110,253,0.18)" : brand.border}`,
        boxShadow: tree.isPrimary
          ? "0 10px 28px -10px rgba(13,110,253,0.28)"
          : "0 1px 2px rgba(15,23,42,0.04)",
        transition: "transform 120ms ease",
        "&:active": { transform: "scale(0.99)" },
        "&:focus-visible": { outline: `2px solid ${brand.primary}`, outlineOffset: 2 },
      }}
    >
      {tree.isPrimary && (
        // The soft glow in the design's corner — marks your own tree at a glance.
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: "50%",
            bgcolor: "rgba(13,110,253,0.07)",
            filter: "blur(24px)",
            pointerEvents: "none",
          }}
        />
      )}

      <Stack spacing={1.5} sx={{ position: "relative" }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <AccessBadge access={tree.access} strong={tree.isPrimary} />
          {tree.isPrimary ? (
            <Typography
              sx={{
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: brand.primary,
                bgcolor: brand.primarySoft,
                px: 1,
                py: 0.25,
                borderRadius: 1,
                flexShrink: 0,
              }}
            >
              Your tree
            </Typography>
          ) : (
            updated && (
              <Typography sx={{ fontSize: 12, color: brand.slateMuted, flexShrink: 0 }}>
                Updated {updated}
              </Typography>
            )
          )}
        </Stack>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h2"
            sx={{
              fontSize: tree.isPrimary ? 22 : 18,
              fontWeight: 800,
              lineHeight: 1.25,
              color: brand.ink,
              overflowWrap: "anywhere",
            }}
          >
            {tree.name}
          </Typography>
          {place && (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5, color: brand.slateMuted }}>
              <PlaceOutlinedIcon sx={{ fontSize: 16, color: brand.primary }} />
              <Typography noWrap sx={{ fontSize: 13.5 }}>
                {place}
              </Typography>
            </Stack>
          )}
        </Box>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1.5}
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: tree.isPrimary ? brand.warmSoft : brand.canvas,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
            {tree.photos.length > 0 ? (
              <AvatarGroup
                max={3}
                sx={{ "& .MuiAvatar-root": { width: 36, height: 36, border: `2px solid ${brand.surface}` } }}
              >
                {tree.photos.map((photo) => (
                  <Avatar key={photo} src={photo} alt="" />
                ))}
              </AvatarGroup>
            ) : (
              <Avatar sx={{ width: 36, height: 36, bgcolor: brand.accentSoft, color: brand.accentDark }}>
                <AccountTreeOutlinedIcon sx={{ fontSize: 20 }} />
              </Avatar>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: brand.ink }}>{members}</Typography>
              {!tree.isPrimary && generations && (
                <Typography sx={{ fontSize: 12, color: brand.slateMuted }}>{generations} recorded</Typography>
              )}
              {tree.isPrimary && updated && (
                <Typography sx={{ fontSize: 12, color: brand.slateMuted }}>Updated {updated}</Typography>
              )}
            </Box>
          </Stack>
          {tree.isPrimary && tree.generations > 0 ? (
            <Box sx={{ textAlign: "right", flexShrink: 0 }}>
              <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: brand.primary }}>
                {tree.generations}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: brand.slateMuted }}>
                {tree.generations === 1 ? "Generation" : "Generations"}
              </Typography>
            </Box>
          ) : (
            !tree.isPrimary && <ChevronRightIcon sx={{ color: brand.slateMuted, flexShrink: 0 }} />
          )}
        </Stack>

        {tree.isPrimary && (
          <Button
            variant="contained"
            size="large"
            fullWidth
            disableElevation
            endIcon={<ArrowForwardIcon />}
            // The card itself opens the tree; this is the same action, made
            // obvious. Stop the click here so it doesn't open twice.
            onClick={(event) => {
              event.stopPropagation();
              onOpen(tree);
            }}
            sx={{ textTransform: "none", fontWeight: 700, py: 1.25 }}
          >
            Open tree
          </Button>
        )}
      </Stack>
    </Paper>
  );
};

const FilterPill: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({
  label,
  active,
  onClick,
}) => (
  <Chip
    label={label}
    clickable
    onClick={onClick}
    aria-pressed={active}
    sx={{
      fontWeight: 700,
      fontSize: 13,
      flexShrink: 0,
      ...(active
        ? { bgcolor: brand.primary, color: "#fff", "&:hover": { bgcolor: brand.primaryDark } }
        : { bgcolor: brand.surface, color: brand.slate, border: `1px solid ${brand.border}` }),
    }}
  />
);

export const TreeListPage: React.FC = () => {
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { currentUser, initialized, isApproved, isSuperAdmin } = useAuth();
  const [trees, setTrees] = useState<MyTree[] | null>(cachedTrees);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AccessFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await ApiService.getMyTrees();
      cachedTrees = result;
      setTrees(result);
    } catch {
      setError("Couldn't load your trees. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (!currentUser) {
      cachedTrees = null;
      setTrees(null);
      return;
    }
    void load();
  }, [initialized, currentUser, load]);

  // Back from a tree lands where the list was left. The cached trees render on
  // this first pass, so the page is already tall enough to scroll to.
  useLayoutEffect(() => {
    const scroller = scrollParentOf(rootRef.current);
    if (navigationType === "POP" && savedScrollTop != null && scroller) {
      scroller.scrollTop = savedScrollTop;
    }
    savedScrollTop = null;
    // Mount only: later renders are refreshes, not arrivals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTree = useCallback(
    (tree: MyTree) => {
      savedScrollTop = scrollParentOf(rootRef.current)?.scrollTop ?? null;
      // The flag tells the tree's back arrow that this list is behind it in
      // history, so Back can pop to it instead of pushing a new copy.
      navigate(`/families?tree=${tree.id}`, { state: { fromTreeList: true } });
    },
    [navigate],
  );

  const editCount = (trees ?? []).filter(canEdit).length;
  const viewCount = (trees ?? []).length - editCount;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (trees ?? []).filter((tree) => {
      if (filter === "edit" && !canEdit(tree)) return false;
      if (filter === "view" && canEdit(tree)) return false;
      if (!needle) return true;
      return [tree.name, tree.locationName, tree.districtName, tree.casteName, tree.subCasteName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [trees, query, filter]);

  const canCreate = Boolean(currentUser) && (isApproved || isSuperAdmin());

  let body: React.ReactNode;
  if (!initialized || (currentUser && trees === null && !error)) {
    body = (
      <Stack spacing={2}>
        {[220, 150, 150].map((height, i) => (
          <Skeleton key={i} variant="rounded" height={height} sx={{ borderRadius: 3 }} />
        ))}
      </Stack>
    );
  } else if (!currentUser) {
    body = (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${brand.border}`, textAlign: "center" }}>
        <Typography sx={{ fontWeight: 800, fontSize: 18, color: brand.ink }}>
          Sign in to see your family trees
        </Typography>
        <Typography sx={{ mt: 0.75, fontSize: 14, color: brand.slateMuted }}>
          Your trees, and the ones you've been invited to, will be listed here.
        </Typography>
        <Button
          variant="contained"
          disableElevation
          startIcon={<LoginIcon />}
          onClick={() => navigate("/login")}
          sx={{ mt: 2, textTransform: "none", fontWeight: 700, px: 3 }}
        >
          Sign in
        </Button>
      </Paper>
    );
  } else if (error && !trees) {
    body = (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void load()}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  } else if ((trees ?? []).length === 0) {
    body = (
      <>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${brand.border}`, textAlign: "center" }}>
          <AccountTreeOutlinedIcon sx={{ fontSize: 40, color: brand.primary }} />
          <Typography sx={{ mt: 1, fontWeight: 800, fontSize: 18, color: brand.ink }}>
            You're not part of a tree yet
          </Typography>
          <Typography sx={{ mt: 0.75, fontSize: 14, color: brand.slateMuted }}>
            {canCreate
              ? "Start your family's tree with the New tree button below."
              : "When someone invites you to their tree, it will appear here."}
          </Typography>
        </Paper>
      </>
    );
  } else {
    const showFilters = editCount > 0 && viewCount > 0;
    body = (
      <>
        {(trees ?? []).length > 3 && (
          <TextField
            fullWidth
            size="small"
            type="search"
            placeholder="Search by tree, village or caste"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: brand.slateMuted }} />
                </InputAdornment>
              ),
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, bgcolor: brand.surface } }}
          />
        )}

        {showFilters && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ overflowX: "auto", pb: 0.5, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
          >
            <FilterPill label={`All trees (${trees!.length})`} active={filter === "all"} onClick={() => setFilter("all")} />
            <FilterPill label={`Can edit (${editCount})`} active={filter === "edit"} onClick={() => setFilter("edit")} />
            <FilterPill label={`View only (${viewCount})`} active={filter === "view"} onClick={() => setFilter("view")} />
          </Stack>
        )}

        <Stack
          direction="row"
          spacing={1.25}
          alignItems="flex-start"
          sx={{ p: 1.5, borderRadius: 2.5, bgcolor: brand.primarySoft }}
        >
          <LightbulbOutlinedIcon sx={{ fontSize: 20, color: brand.primary, mt: 0.125 }} />
          <Typography sx={{ fontSize: 13.5, color: brand.slate }}>
            Tap a tree to open it full screen. Pinch to zoom, drag to move around, and tap a
            person to see or add their family.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="warning" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          {visible.map((tree) => (
            <TreeCard key={tree.id} tree={tree} onOpen={openTree} />
          ))}
          {visible.length === 0 && (
            <Typography sx={{ textAlign: "center", color: brand.slateMuted, fontSize: 14, py: 2 }}>
              No tree matches “{query.trim()}”.
            </Typography>
          )}
        </Stack>

      </>
    );
  }

  const total = trees?.length ?? 0;

  return (
    <Box ref={rootRef} sx={{ minHeight: "100%", bgcolor: brand.pageCanvas }}>
      <Helmet>
        <title>My Family Trees - Kinvia</title>
      </Helmet>
      {/* Bottom padding clears the floating New tree button over the last card. */}
      <Stack
        spacing={2}
        sx={{ px: 2, pt: 2.5, pb: canCreate ? 12 : 4, maxWidth: 640, mx: "auto" }}
      >
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography component="h1" sx={{ fontSize: 26, fontWeight: 800, color: brand.ink, lineHeight: 1.2 }}>
              My Family Trees
            </Typography>
            {total > 0 && (
              <Chip
                size="small"
                label={countLabel(total, "tree", "trees")}
                sx={{ bgcolor: brand.accentSoft, color: brand.accentDark, fontWeight: 700, flexShrink: 0 }}
              />
            )}
          </Stack>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: brand.slateMuted }}>
            Your family's tree and the ones you've been invited to.
          </Typography>
        </Box>

        {body}
      </Stack>

      {canCreate && (
        <Fab
          variant="extended"
          color="primary"
          aria-label="Create a new tree"
          onClick={() => setCreateOpen(true)}
          sx={{
            position: "fixed",
            right: 16,
            // Above the tab bar (0 when there is none).
            bottom: "calc(16px + var(--kinvia-bottom-nav, 0px))",
            zIndex: (theme) => theme.zIndex.speedDial,
            textTransform: "none",
            fontWeight: 800,
            fontSize: 15,
            px: 2.5,
            boxShadow: "0 8px 20px rgba(13,110,253,0.35)",
          }}
        >
          <AddIcon sx={{ mr: 0.75 }} />
          New tree
        </Fab>
      )}

      <AddTree
        hideTrigger
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(createdTreeId) => {
          setCreateOpen(false);
          cachedTrees = null;
          // A new tree is empty: `setup=1` starts the same guided setup the
          // desktop create flow runs.
          navigate(`/families?tree=${createdTreeId}&setup=1`, { state: { fromTreeList: true } });
        }}
      />
    </Box>
  );
};

export default TreeListPage;
