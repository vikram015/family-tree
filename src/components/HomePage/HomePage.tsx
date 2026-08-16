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
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchDashboardStatistics,
  selectStatistics,
  selectStatisticsLoading,
} from "../../store/slices/statisticsSlice";
import { ApiService } from "../../services/apiService";
import { useAuth } from "../hooks/useAuth";
import { resolveDefaultFamilyTreePath } from "../../utils/defaultFamilyTreeNavigation";
import { FullScreenMobilePicker } from "../FullScreenMobilePicker";

interface SearchResult {
  id: string;
  name: string;
  type: "person" | "business" | "profession";
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
      ? { bg: "#ecfeff", color: "#0f766e" }
      : accent === "amber"
        ? { bg: "#fff7ed", color: "#b45309" }
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
    } else if (result.treeId) {
      const params = new URLSearchParams();
      params.set("tree", result.treeId);
      navigate(`/families?${params.toString()}`);
    } else if (result.type === "business" || result.type === "profession") {
      navigate("/business");
    }
  };

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
          background:
            "linear-gradient(120deg, #fff7ed 0%, #eefaf4 40%, #e8f1ff 100%)",
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
                            <SearchIcon sx={{ color: "#0f766e", mr: 1 }} />
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
                              <SearchIcon sx={{ color: "#0f766e", mr: 1 }} />
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
                    bgcolor: "#b45309",
                    "&:hover": { bgcolor: "#92400e" },
                  }}
                >
                  {continueTreeLoading ? "Opening..." : currentUser ? "Continue Your Tree" : "Explore Family Trees"}
                </Button>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/business"
                  sx={{ fontWeight: 700, borderColor: "#0f766e", color: "#0f766e" }}
                >
                  Explore Family Business
                </Button>
              </Stack>
            </Paper>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1.5,
                alignContent: "start",
              }}
            >
              {[
                { label: "Members", value: totalPeople, icon: <PeopleIcon /> },
                { label: "Trees", value: totalTrees, icon: <AccountTreeIcon /> },
                { label: "Locations", value: totalLocations, icon: <LocationCityIcon /> },
                { label: "Businesses", value: totalBusinesses, icon: <BusinessIcon /> },
              ].map((item) => (
                <Card key={item.label} sx={{ borderRadius: 2.5 }}>
                  <CardContent sx={{ py: 2.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ color: "#0f766e", display: "flex" }}>{item.icon}</Box>
                      <Typography variant="body2" color="text.secondary">
                        {item.label}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 28, fontWeight: 800, mt: 1 }}>
                      {loadingStats ? "-" : item.value}
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
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
            gap: 2,
            mb: 5,
          }}
        >
          <Card>
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

          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Profile Completeness
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                {professionCoverage}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={professionCoverage}
                sx={{ mt: 1.3, height: 8, borderRadius: 6 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.7, display: "block" }}>
                Based on profession mapping across members
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Suggested Next Action
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
                Complete missing family details
              </Typography>
              <Button
                component={Link}
                to="/families"
                size="small"
                sx={{ mt: 1, px: 0, fontWeight: 700 }}
                endIcon={<ArrowForwardIcon />}
              >
                Complete now
              </Button>
            </CardContent>
          </Card>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 2,
          }}
        >
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <PeopleIcon sx={{ color: "#b45309" }} />
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
                            bgcolor: "#fff7ed",
                            color: "#b45309",
                            fontWeight: 700,
                            minWidth: 42,
                          }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
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

          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <TimelineIcon sx={{ color: "#0f766e" }} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Family Pulse
                </Typography>
              </Stack>
              <Stack spacing={1.2}>
                {pulseItems.map((item) => (
                  <Box key={item} sx={{ display: "flex", gap: 1.2, alignItems: "flex-start" }}>
                    <TaskAltIcon sx={{ color: "#0f766e", fontSize: 19, mt: 0.2 }} />
                    <Typography variant="body2" color="text.secondary">
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <HistoryEduIcon sx={{ color: "#b45309" }} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Today in Family History
                </Typography>
              </Stack>
              <Stack spacing={1.2}>
                {historyTodayItems.map((item, idx) => (
                  <Box key={item} sx={{ display: "flex", gap: 1.2, alignItems: "flex-start" }}>
                    {idx === 0 ? (
                      <AutoStoriesIcon sx={{ color: "#b45309", fontSize: 19, mt: 0.2 }} />
                    ) : (
                      <FavoriteBorderIcon sx={{ color: "#b45309", fontSize: 19, mt: 0.2 }} />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Divider sx={{ my: 5 }} />

        <Box sx={{ textAlign: "center", py: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
            Your legacy grows with every update
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Preserve roots, reconnect generations, and keep family memory alive.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
            <Button
              variant="contained"
              component={Link}
              to="/families"
              sx={{ bgcolor: "#0f766e", "&:hover": { bgcolor: "#115e59" }, fontWeight: 700 }}
            >
              Open Family Trees
            </Button>
            <Button variant="outlined" component={Link} to="/contact" sx={{ fontWeight: 700 }}>
              Contact Support
            </Button>
          </Stack>
        </Box>
      </Container>
    </>
  );
};
