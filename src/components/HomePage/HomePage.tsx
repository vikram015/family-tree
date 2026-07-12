import React, { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Divider,
  TextField,
  InputAdornment,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  ClickAwayListener,
  LinearProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import StoreIcon from "@mui/icons-material/Store";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PeopleIcon from "@mui/icons-material/People";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import BusinessIcon from "@mui/icons-material/Business";
import TimelineIcon from "@mui/icons-material/Timeline";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import FavoriteIcon from "@mui/icons-material/Favorite";
import LocalFloristOutlinedIcon from "@mui/icons-material/LocalFloristOutlined";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchDashboardStatistics,
  selectStatistics,
  selectStatisticsLoading,
} from "../../store/slices/statisticsSlice";
import { ApiService, FamilyEvents } from "../../services/apiService";
import { useAuth } from "../hooks/useAuth";
import { resolveDefaultFamilyTreePath } from "../../utils/defaultFamilyTreeNavigation";
import { FullScreenMobilePicker } from "../FullScreenMobilePicker";
import { AnimatedCounter } from "../common/AnimatedCounter";
import { brand } from "../../theme/brand";

interface SearchResult {
  id: string;
  name: string;
  type: "person" | "business" | "profession";
  /** For business/profession results, the associated (owner) person id. */
  personId?: string;
  treeId?: string;
  treeName?: string;
  personPhotoUrl?: string;
  gotra?: string;
  extra?: string;
  locationName?: string;
  casteName?: string;
  subCasteName?: string;
  parentHierarchy?: Array<{ id: string; name: string; generation: number }>;
}

interface DashboardContributor {
  personName: string;
  peopleAdded: number;
  personId?: string | null;
  treeId?: string | null;
}

function getInitials(value?: string): string {
  if (!value) return "?";
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function renderMetaPill(label: string, value?: string, accent?: "teal" | "amber" | "slate") {
  if (!value) return null;

  const styles =
    accent === "teal"
      ? { bg: brand.primarySoft, color: brand.primary }
      : accent === "amber"
        ? { bg: brand.accentSoft, color: brand.accent }
        : { bg: "#f1f5f9", color: "#475569" };

  return (
    <Box
      key={`${label}-${value}`}
      sx={{
        px: 0.9,
        py: 0.45,
        borderRadius: 999,
        bgcolor: styles.bg,
        color: styles.color,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      <Box component="span">{value}</Box>
    </Box>
  );
}

export const HomePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [continueTreeLoading, setContinueTreeLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Personalized profile insight for the logged-in user (completeness + next action).
  const [profileInsight, setProfileInsight] = useState<{
    completeness: number;
    completed: number;
    total: number;
    nextAction: { title: string; description: string; to: string; cta: string } | null;
    // Pending branch-access requests the user has raised (write access to a branch).
    pendingBranchAccess: Array<{ label: string }>;
  } | null>(null);
  const [profileInsightLoading, setProfileInsightLoading] = useState(false);

  // Today's family events (birthdays, remembrances, anniversaries) for the
  // logged-in user's tree.
  const [familyEvents, setFamilyEvents] = useState<FamilyEvents | null>(null);
  const [familyEventsLoading, setFamilyEventsLoading] = useState(false);

  const statistics = useAppSelector(selectStatistics);
  const loadingStats = useAppSelector(selectStatisticsLoading);

  const displayName = userProfile?.displayName || userProfile?.name || "Family Member";
  const loggedInLabel =
    userProfile?.displayName ||
    userProfile?.name ||
    currentUser?.email ||
    "Guest";

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    setShowResults(true);
    try {
      const rows = await ApiService.globalSearch(query.trim());

      const results: SearchResult[] = [];

      rows.forEach((row: any) => {
        const lineageText =
          row.entityType === "person" && Array.isArray(row.parentHierarchy)
            ? row.parentHierarchy
                .slice(-5)
                .map((a: any) => a?.name)
                .filter(Boolean)
                .join(" -> ")
            : "";

        results.push({
          id: row.entityId,
          name: row.title || "Unknown",
          type: row.entityType,
          personId: row.personId || undefined,
          treeId: row.treeId,
          extra:
            row.entityType === "person"
              ? lineageText || "Lineage: N/A"
              : row.subtitle || undefined,
          treeName: row.treeName || undefined,
          personPhotoUrl: row.personPhotoUrl || undefined,
          gotra: row.gotra || undefined,
          locationName: row.locationName || undefined,
          casteName: row.casteName || undefined,
          subCasteName: row.subCasteName || undefined,
          parentHierarchy: row.parentHierarchy || [],
        });
      });

      setSearchResults(results);
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => performSearch(value), 300);
  };

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setSearchQuery("");
    if (result.type === "person" && result.id) {
      navigate(`/profile/person/${result.id}`);
    } else if (result.type === "business") {
      // Open the business owner's profile when we know them; else the listing.
      if (result.personId) {
        navigate(`/profile/person/${result.personId}`);
      } else {
        navigate("/business");
      }
    } else if (result.treeId) {
      const params = new URLSearchParams();
      params.set("tree", result.treeId);
      navigate(`/families?${params.toString()}`);
    } else if (result.type === "profession") {
      navigate("/business");
    }
  };

  const handleContributorClick = useCallback(
    (contributor: DashboardContributor) => {
      if (!contributor.personId) return;
      const params = new URLSearchParams();
      if (contributor.treeId) params.set("tree", contributor.treeId);
      params.set("personId", contributor.personId);
      navigate(`/families?${params.toString()}`);
    },
    [navigate],
  );

  const handleContinueToYourTree = useCallback(async () => {
    if (!currentUser) {
      navigate("/families");
      return;
    }

    setContinueTreeLoading(true);
    try {
      navigate(await resolveDefaultFamilyTreePath());
    } finally {
      setContinueTreeLoading(false);
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    dispatch(fetchDashboardStatistics());
  }, [dispatch]);

  // Compute the logged-in user's own profile completeness and the single most
  // useful next action to fill in. Only personalized when signed in.
  useEffect(() => {
    let cancelled = false;

    const computeProfileInsight = async () => {
      if (!currentUser || !userProfile) {
        setProfileInsight(null);
        return;
      }

      const peopleId = userProfile.peopleId;

      // Load all of the user's pending requests once, so we can reflect both a
      // pending profile link and any pending branch-access requests.
      let pendingRequests: any[] = [];
      try {
        const requests = await ApiService.getMyLinkRequests();
        pendingRequests = (requests || []).filter((r) => r.status === "pending");
      } catch (err) {
        console.error("Failed to load link requests:", err);
      }
      if (cancelled) return;

      const pendingBranchAccess = pendingRequests
        .filter((r) => r.requestType === "branch_access_request")
        .map((r) => ({
          label:
            r.targetPersonName || r.targetTreeName
              ? `${r.targetPersonName || r.targetTreeName} branch`
              : "a branch",
        }));

      // Not yet linked to a person in the tree — the most important step,
      // unless a link request is already awaiting the owner's approval.
      if (!peopleId) {
        const pendingLink = pendingRequests.find(
          (r) => r.requestType === "user_to_tree_node",
        );

        setProfileInsight({
          completeness: 0,
          completed: 0,
          total: 1,
          pendingBranchAccess,
          nextAction: pendingLink
            ? {
                title: "Profile link pending approval",
                description: `Your request to link with ${pendingLink.targetPersonName || "your family member"} is awaiting the tree owner's approval.`,
                to: "/profile",
                cta: "View request",
              }
            : {
                title: "Finish setting up your profile",
                description: "Find yourself in the family tree and link your account.",
                to: "/onboarding",
                cta: "Finish setting up",
              },
        });
        return;
      }

      setProfileInsightLoading(true);
      try {
        const [person, professions] = await Promise.all([
          ApiService.getPersonById(peopleId),
          ApiService.getProfessionsByPerson(peopleId).catch(() => []),
        ]);
        if (cancelled) return;

        const checklist: Array<{ done: boolean; title: string; description: string }> = [
          {
            done: Boolean((person as any)?.photoUrl),
            title: "Add a profile photo",
            description: "A photo helps relatives recognize you in the tree.",
          },
          {
            done: Boolean(person?.dob),
            title: "Add your date of birth",
            description: "Dates keep the lineage timeline accurate.",
          },
          {
            done: Boolean(person?.gender),
            title: "Add your gender",
            description: "Gender helps place you correctly in the family tree.",
          },
          {
            done: Boolean(userProfile.phone),
            title: "Add a contact number",
            description: "A phone number helps family reconnect with you.",
          },
          {
            done: Array.isArray(professions) && professions.length > 0,
            title: "Add your profession",
            description: "Share what you do to enrich the family network.",
          },
        ];

        const total = checklist.length;
        const completed = checklist.filter((item) => item.done).length;
        const completeness = Math.round((completed / total) * 100);
        const firstMissing = checklist.find((item) => !item.done);

        setProfileInsight({
          completeness,
          completed,
          total,
          pendingBranchAccess,
          nextAction: firstMissing
            ? {
                title: firstMissing.title,
                description: firstMissing.description,
                to: "/profile",
                cta: "Complete now",
              }
            : null,
        });
      } catch (err) {
        console.error("Failed to compute profile insight:", err);
        if (!cancelled) setProfileInsight(null);
      } finally {
        if (!cancelled) setProfileInsightLoading(false);
      }
    };

    void computeProfileInsight();
    return () => {
      cancelled = true;
    };
  }, [currentUser, userProfile]);

  // Load today's family events for the logged-in, tree-linked user.
  useEffect(() => {
    if (!currentUser || !userProfile?.peopleId) {
      setFamilyEvents(null);
      return;
    }
    let cancelled = false;
    setFamilyEventsLoading(true);
    ApiService.getTodaysFamilyEvents()
      .then((events) => {
        if (!cancelled) setFamilyEvents(events);
      })
      .catch((err) => {
        console.error("Failed to load family events:", err);
        if (!cancelled) setFamilyEvents(null);
      })
      .finally(() => {
        if (!cancelled) setFamilyEventsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser, userProfile?.peopleId]);

  const renderSearchResults = (onPick?: () => void) => {
    if (!showResults) return null;

    return (
      <Paper
        elevation={8}
        sx={{
          position: isMobile ? "static" : "absolute",
          top: isMobile ? "auto" : "100%",
          left: 0,
          right: 0,
          zIndex: 1300,
          maxHeight: isMobile ? "none" : 420,
          overflow: "auto",
          mt: isMobile ? 1.5 : 0.5,
          borderRadius: 2,
        }}
      >
        {searchResults.length > 0 ? (
          <List dense disablePadding>
            {searchResults.map((result) => (
              <ListItem
                key={`${result.type}-${result.id}`}
                component="div"
                onClick={() => {
                  onPick?.();
                  handleResultClick(result);
                }}
                sx={{
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {result.type === "person" ? (
                    <Avatar
                      src={result.personPhotoUrl || undefined}
                      sx={{
                        width: 28,
                        height: 28,
                        fontSize: 11,
                        fontWeight: 700,
                        bgcolor: "#e0f2fe",
                        color: "#0369a1",
                      }}
                    >
                      {getInitials(result.name)}
                    </Avatar>
                  ) : result.type === "profession" ? (
                    <TimelineIcon color="action" />
                  ) : (
                    <StoreIcon color="secondary" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Stack spacing={0.75}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {result.name}
                      </Typography>
                      {result.type === "person" &&
                        (result.locationName || result.gotra || result.casteName) && (
                          <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", rowGap: 0.75 }}>
                            {renderMetaPill("Location", result.locationName, "teal")}
                            {renderMetaPill("Caste", result.casteName, "slate")}
                            {renderMetaPill("Sub caste", result.gotra, "slate")}
                          </Stack>
                        )}
                    </Stack>
                  }
                  secondary={result.extra || undefined}
                  primaryTypographyProps={{ fontWeight: 600 }}
                  secondaryTypographyProps={{ fontSize: "0.75rem" }}
                />
                <Chip
                  label={
                    result.type === "person"
                      ? "Person"
                      : result.type === "profession"
                        ? "Profession"
                        : "Business"
                  }
                  size="small"
                  color={
                    result.type === "person"
                      ? "primary"
                      : result.type === "business"
                        ? "secondary"
                        : "default"
                  }
                  variant="outlined"
                />
              </ListItem>
            ))}
          </List>
        ) : !isSearching ? (
          <Box sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No results found for "{searchQuery}"
            </Typography>
          </Box>
        ) : null}
      </Paper>
    );
  };

  const totalPeople = statistics?.totalPeople || 0;
  const totalTrees = statistics?.totalTrees || 0;
  const totalLocations = statistics?.totalLocations || 0;
  const totalBusinesses = statistics?.totalBusinesses || 0;
  const topContributors = Array.isArray(statistics?.topContributors)
    ? (statistics.topContributors as DashboardContributor[])
    : [];
  const professionCoverage = totalPeople
    ? Math.round(((statistics?.peopleWithProfessions || 0) / totalPeople) * 100)
    : 0;

  const pulseItems = [
    `Families across ${totalLocations} locations are preserving lineage records.`,
    `${totalBusinesses} family businesses are now visible in the network.`,
    `${statistics?.totalProfessionsAssigned || 0} professional links are mapped.`,
  ];

  const historyTodayItems = [
    "Remember elders by adding stories and photos to their profiles.",
    "Reconnect branches by linking missing parents and spouses.",
    "Preserve lineage accuracy by completing unknown dates of birth.",
  ];

  return (
    <>
      <Helmet>
        <title>Kinvia - Preserve Your Family Legacy</title>
        <meta
          name="description"
          content="Kinvia helps families preserve lineage, stories, and relationships for future generations."
        />
      </Helmet>

      <Box
        sx={{
          background: `linear-gradient(120deg, ${brand.warmSoft} 0%, ${brand.warm} 55%, ${brand.warmSoft} 100%)`,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.2fr 0.8fr" },
              gap: 3,
              alignItems: "stretch",
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 4 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                background:
                  "linear-gradient(140deg, rgba(255,255,255,0.95), rgba(255,255,255,0.75))",
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                Welcome back, {displayName}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.8 }}>
                Logged in as: <strong>{loggedInLabel}</strong>
              </Typography>
              <Typography variant="h6" sx={{ color: "text.secondary", mb: 1.5 }}>
                Your family story is growing.
              </Typography>
              <Typography sx={{ color: "text.secondary", mb: 3 }}>
                Every update you make today becomes heritage tomorrow.
              </Typography>

              <FullScreenMobilePicker
                title="Search"
                closeLabel="Close search"
                dialogContent={({ closeDialog }) => (
                  <>
                    <TextField
                      fullWidth
                      autoFocus
                      placeholder="Search family members, businesses..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onFocus={() => {
                        if (searchResults.length > 0) setShowResults(true);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && searchQuery.trim()) {
                          performSearch(searchQuery);
                        }
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: brand.primary, mr: 1 }} />
                          </InputAdornment>
                        ),
                        endAdornment: isSearching ? (
                          <InputAdornment position="end">
                            <CircularProgress size={18} />
                          </InputAdornment>
                        ) : null,
                      }}
                      sx={{
                        bgcolor: "white",
                        borderRadius: 2,
                      }}
                    />
                    {renderSearchResults(closeDialog)}
                  </>
                )}
              >
                {({ isMobile: mobilePicker, openDialog }) => (
                  <ClickAwayListener onClickAway={() => !mobilePicker && setShowResults(false)}>
                    <Box sx={{ maxWidth: 640, position: "relative", mb: 3 }}>
                      <TextField
                        fullWidth
                        placeholder="Search family members, businesses..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onClick={openDialog}
                        onFocus={() => {
                          if (mobilePicker) {
                            openDialog();
                            return;
                          }
                          if (searchResults.length > 0) setShowResults(true);
                        }}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && searchQuery.trim()) {
                            performSearch(searchQuery);
                          }
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon sx={{ color: brand.primary, mr: 1 }} />
                            </InputAdornment>
                          ),
                          endAdornment: isSearching ? (
                            <InputAdornment position="end">
                              <CircularProgress size={18} />
                            </InputAdornment>
                          ) : null,
                        }}
                        sx={{
                          bgcolor: "white",
                          borderRadius: 2,
                        }}
                        inputProps={{
                          readOnly: mobilePicker,
                        }}
                      />
                      {!mobilePicker && renderSearchResults()}
                    </Box>
                  </ClickAwayListener>
                )}
              </FullScreenMobilePicker>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  variant="contained"
                  onClick={() => void handleContinueToYourTree()}
                  disabled={continueTreeLoading}
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    fontWeight: 700,
                    bgcolor: brand.primary,
                    "&:hover": { bgcolor: brand.primaryDark },
                  }}
                >
                  {continueTreeLoading ? "Opening..." : currentUser ? "Continue Your Tree" : "Explore Family Trees"}
                </Button>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/business"
                  sx={{ fontWeight: 700, borderColor: brand.primary, color: brand.primary }}
                >
                  Explore Family Business
                </Button>
              </Stack>
            </Paper>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                // Two equal rows that fill the block height so the bottom edge
                // aligns with the welcome card (block stretches via the outer grid).
                gridTemplateRows: { xs: "auto auto", md: "1fr 1fr" },
                gap: 1.5,
              }}
            >
              {[
                { label: "Members", value: totalPeople, icon: <PeopleIcon /> },
                { label: "Trees", value: totalTrees, icon: <AccountTreeIcon /> },
                { label: "Locations", value: totalLocations, icon: <LocationCityIcon /> },
                { label: "Businesses", value: totalBusinesses, icon: <BusinessIcon /> },
              ].map((item) => (
                <Card
                  key={item.label}
                  sx={{
                    borderRadius: 2.5,
                    height: "100%",
                    display: "flex",
                  }}
                >
                  <CardContent
                    sx={{
                      py: 2.5,
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      "&:last-child": { pb: 2.5 },
                    }}
                  >
                    <Box sx={{ color: brand.primary, display: "flex", mb: 1.5 }}>
                      {item.icon}
                    </Box>
                    <Typography
                      sx={{
                        textTransform: "uppercase",
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        color: "text.secondary",
                      }}
                    >
                      {item.label}
                    </Typography>
                    <Typography sx={{ fontSize: 28, fontWeight: 800, mt: 0.5, color: brand.ink }}>
                      <AnimatedCounter value={item.value} loading={loadingStats} />
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: currentUser ? "1fr 1fr 1fr" : "1fr",
            },
            gap: 2,
            mb: 5,
            alignItems: "stretch",
          }}
        >
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Your Contribution Snapshot
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                Keep your lineage alive
              </Typography>
              <Typography variant="body2" sx={{ mt: 1.2, color: "text.secondary" }}>
                Add one profile this week and strengthen your family memory map.
              </Typography>
            </CardContent>
          </Card>

          {currentUser && (
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Profile Completeness
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: brand.accent }}>
                <AnimatedCounter
                  value={profileInsight ? profileInsight.completeness : professionCoverage}
                  loading={profileInsight ? profileInsightLoading : loadingStats}
                />%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={profileInsight ? profileInsight.completeness : professionCoverage}
                sx={{
                  mt: 1.3,
                  height: 8,
                  borderRadius: 6,
                  bgcolor: brand.accentSoft,
                  "& .MuiLinearProgress-bar": { bgcolor: brand.accent },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.7, display: "block" }}>
                {profileInsight
                  ? `${profileInsight.completed} of ${profileInsight.total} profile details completed`
                  : "Based on profession mapping across members"}
              </Typography>
            </CardContent>
          </Card>
          )}

          {currentUser && (
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Suggested Next Action
              </Typography>
              {profileInsight && !profileInsight.nextAction ? (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
                    Your profile is complete 🎉
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.7, display: "block" }}>
                    Help others by completing their family details too.
                  </Typography>
                  <Button
                    onClick={() => void handleContinueToYourTree()}
                    disabled={continueTreeLoading}
                    size="small"
                    sx={{ mt: 1, px: 0, fontWeight: 700, color: brand.primary }}
                    endIcon={<ArrowForwardIcon />}
                  >
                    {continueTreeLoading ? "Opening..." : "Open Your Tree"}
                  </Button>
                </>
              ) : (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
                    {profileInsight?.nextAction?.title || "Complete missing family details"}
                  </Typography>
                  {profileInsight?.nextAction?.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.7, display: "block" }}>
                      {profileInsight.nextAction.description}
                    </Typography>
                  )}
                  <Button
                    component={Link}
                    to={profileInsight?.nextAction?.to || "/families"}
                    size="small"
                    sx={{ mt: 1, px: 0, fontWeight: 700, color: brand.primary }}
                    endIcon={<ArrowForwardIcon />}
                  >
                    {profileInsight?.nextAction?.cta || "Complete now"}
                  </Button>
                </>
              )}

              {profileInsight && profileInsight.pendingBranchAccess.length > 0 && (
                <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    Branch access pending approval
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", rowGap: 0.75, mt: 0.8 }}>
                    {profileInsight.pendingBranchAccess.map((item, idx) => (
                      <Chip
                        key={`${item.label}-${idx}`}
                        size="small"
                        label={item.label}
                        sx={{ bgcolor: brand.primarySoft, color: brand.primary, fontWeight: 600 }}
                      />
                    ))}
                  </Stack>
                  <Button
                    component={Link}
                    to="/requests"
                    size="small"
                    sx={{ mt: 0.8, px: 0, fontWeight: 700, color: brand.primary }}
                    endIcon={<ArrowForwardIcon />}
                  >
                    View requests
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
          )}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 2,
            alignItems: "stretch",
          }}
        >
          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <PeopleIcon sx={{ color: brand.primary }} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Top Contributors
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                People who have added the most family members.
              </Typography>
              <Stack spacing={1.2}>
                {loadingStats ? (
                  <Typography variant="body2" color="text.secondary">
                    Loading contributor statistics...
                  </Typography>
                ) : topContributors.length > 0 ? (
                  topContributors.map((item, index) => (
                    <Box
                      key={`${item.personName}-${index}`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        py: 1,
                        borderBottom:
                          index === topContributors.length - 1 ? "none" : "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Chip
                          label={`#${index + 1}`}
                          size="small"
                          sx={{
                            bgcolor: brand.primarySoft,
                            color: brand.primary,
                            fontWeight: 700,
                            minWidth: 42,
                          }}
                        />
                        <Typography
                          variant="body2"
                          onClick={
                            item.personId
                              ? () => handleContributorClick(item)
                              : undefined
                          }
                          sx={{
                            fontWeight: 600,
                            ...(item.personId && {
                              cursor: "pointer",
                              color: brand.primary,
                              "&:hover": { textDecoration: "underline" },
                            }),
                          }}
                        >
                          {item.personName}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {item.peopleAdded} added
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No contributor statistics available yet.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <TimelineIcon sx={{ color: brand.primary }} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Family Pulse
                </Typography>
              </Stack>
              <Stack spacing={1.2}>
                {pulseItems.map((item) => (
                  <Box key={item} sx={{ display: "flex", gap: 1.2, alignItems: "flex-start" }}>
                    <TaskAltIcon sx={{ color: brand.accent, fontSize: 19, mt: 0.2 }} />
                    <Typography variant="body2" color="text.secondary">
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <HistoryEduIcon sx={{ color: brand.primary }} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {familyEvents ? "Family Events Today" : "Today in Family History"}
                </Typography>
              </Stack>

              {familyEvents ? (
                familyEventsLoading ? (
                  <Typography variant="body2" color="text.secondary">
                    Loading today's events...
                  </Typography>
                ) : familyEvents.birthdays.length === 0 &&
                  familyEvents.anniversaries.length === 0 &&
                  familyEvents.deceased.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No birthdays, anniversaries or remembrances in your family today.
                  </Typography>
                ) : (
                  <Stack spacing={1.4}>
                    {familyEvents.birthdays.map((person) => (
                      <Box
                        key={`bday-${person.id}`}
                        onClick={() => navigate(`/profile/person/${person.id}`)}
                        sx={{ display: "flex", gap: 1.2, alignItems: "flex-start", cursor: "pointer" }}
                      >
                        <CakeOutlinedIcon sx={{ color: brand.primary, fontSize: 19, mt: 0.2 }} />
                        <Typography variant="body2" color="text.secondary">
                          <Box component="span" sx={{ fontWeight: 700, color: brand.ink }}>
                            {person.name}
                          </Box>{" "}
                          {person.age > 0
                            ? `turns ${person.age} today 🎂`
                            : "has a birthday today 🎂"}
                        </Typography>
                      </Box>
                    ))}

                    {familyEvents.anniversaries.map((a) => (
                      <Box
                        key={`anniv-${a.person1Id}-${a.person2Id}`}
                        onClick={() => navigate(`/profile/person/${a.person1Id}`)}
                        sx={{ display: "flex", gap: 1.2, alignItems: "flex-start", cursor: "pointer" }}
                      >
                        <FavoriteIcon sx={{ color: brand.accent, fontSize: 19, mt: 0.2 }} />
                        <Typography variant="body2" color="text.secondary">
                          <Box component="span" sx={{ fontWeight: 700, color: brand.ink }}>
                            {a.person1Name} & {a.person2Name}
                          </Box>{" "}
                          {a.years > 0
                            ? `celebrate ${a.years} year${a.years === 1 ? "" : "s"} together 💍`
                            : "celebrate their anniversary today 💍"}
                        </Typography>
                      </Box>
                    ))}

                    {familyEvents.deceased.map((person) => (
                      <Box
                        key={`dec-${person.id}`}
                        onClick={() => navigate(`/profile/person/${person.id}`)}
                        sx={{ display: "flex", gap: 1.2, alignItems: "flex-start", cursor: "pointer" }}
                      >
                        <LocalFloristOutlinedIcon sx={{ color: brand.slate, fontSize: 19, mt: 0.2 }} />
                        <Typography variant="body2" color="text.secondary">
                          Remembering{" "}
                          <Box component="span" sx={{ fontWeight: 700, color: brand.ink }}>
                            {person.name}
                          </Box>
                          {person.yearsAgo > 0
                            ? ` — ${person.yearsAgo} year${person.yearsAgo === 1 ? "" : "s"} ago`
                            : ""}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )
              ) : (
                <Stack spacing={1.2}>
                  {historyTodayItems.map((item, idx) => (
                    <Box key={item} sx={{ display: "flex", gap: 1.2, alignItems: "flex-start" }}>
                      {idx === 0 ? (
                        <AutoStoriesIcon sx={{ color: brand.primary, fontSize: 19, mt: 0.2 }} />
                      ) : (
                        <FavoriteBorderIcon sx={{ color: brand.primary, fontSize: 19, mt: 0.2 }} />
                      )}
                      <Typography variant="body2" color="text.secondary">
                        {item}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>

        <Divider sx={{ my: 5 }} />

        <Box sx={{ textAlign: "center", py: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
            Your legacy grows with every update
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Preserve roots, reconnect generations, and keep family memory alive.
          </Typography>
        </Box>
      </Container>
    </>
  );
};
