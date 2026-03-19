import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  ClickAwayListener,
  LinearProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import PersonIcon from "@mui/icons-material/Person";
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

interface SearchResult {
  id: string;
  name: string;
  type: "person" | "business" | "profession";
  treeId?: string;
  extra?: string;
  villageName?: string;
  casteName?: string;
  subCasteName?: string;
  parentHierarchy?: Array<{ id: string; name: string; generation: number }>;
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
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suppressMobileSearchOpenRef = useRef(false);

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
              ? [
                  row.villageName ? `Village: ${row.villageName}` : null,
                  row.treeName ? `Tree: ${row.treeName}` : "Family Member",
                  lineageText ? `Lineage: ${lineageText}` : "Lineage: N/A",
                ]
                  .filter(Boolean)
                  .join(" | ")
              : row.subtitle || undefined,
          villageName: row.villageName || undefined,
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
    setSearchDialogOpen(false);
    setSearchQuery("");
    if (result.treeId) {
      const params = new URLSearchParams();
      params.set("tree", result.treeId);
      if (result.type === "person" && result.id) {
        params.set("personId", result.id);
      }
      navigate(`/families?${params.toString()}`);
    } else if (result.type === "business" || result.type === "profession") {
      navigate("/business");
    }
  };

  useEffect(() => {
    dispatch(fetchDashboardStatistics());
  }, [dispatch]);

  const closeSearchDialog = useCallback(() => {
    suppressMobileSearchOpenRef.current = true;
    setSearchDialogOpen(false);
    setShowResults(false);

    window.setTimeout(() => {
      suppressMobileSearchOpenRef.current = false;
    }, 250);
  }, []);

  const renderSearchResults = () => {
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
                onClick={() => handleResultClick(result)}
                sx={{
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {result.type === "person" ? (
                    <PersonIcon color="primary" />
                  ) : result.type === "profession" ? (
                    <TimelineIcon color="action" />
                  ) : (
                    <StoreIcon color="secondary" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={result.name}
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
  const totalVillages = statistics?.totalVillages || 0;
  const totalBusinesses = statistics?.totalBusinesses || 0;
  const professionCoverage = totalPeople
    ? Math.round(((statistics?.peopleWithProfessions || 0) / totalPeople) * 100)
    : 0;

  const pulseItems = [
    `Families across ${totalVillages} villages are preserving lineage records.`,
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

              <ClickAwayListener onClickAway={() => !isMobile && setShowResults(false)}>
                <Box sx={{ maxWidth: 640, position: "relative", mb: 3 }}>
                  <TextField
                    fullWidth
                    placeholder="Search family members, businesses..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onClick={() => {
                      if (isMobile && !suppressMobileSearchOpenRef.current) {
                        setSearchDialogOpen(true);
                      }
                    }}
                    onFocus={() => {
                      if (isMobile) {
                        if (suppressMobileSearchOpenRef.current) {
                          return;
                        }
                        setSearchDialogOpen(true);
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
                      readOnly: isMobile,
                    }}
                  />
                  {!isMobile && renderSearchResults()}
                </Box>
              </ClickAwayListener>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  variant="contained"
                  component={Link}
                  to="/families"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    fontWeight: 700,
                    bgcolor: "#b45309",
                    "&:hover": { bgcolor: "#92400e" },
                  }}
                >
                  Continue Your Tree
                </Button>
                <Button
                  variant="outlined"
                  component={Link}
                  to="/business"
                  sx={{ fontWeight: 700, borderColor: "#0f766e", color: "#0f766e" }}
                >
                  Explore Family Network
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
                { label: "Villages", value: totalVillages, icon: <LocationCityIcon /> },
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

      <Dialog
        open={searchDialogOpen}
        onClose={closeSearchDialog}
        fullScreen={isMobile}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pl: 2,
            pr: 1.5,
            py: 1.5,
          }}
        >
          Search
          <IconButton
            aria-label="Close search"
            edge="end"
            onClick={(event) => {
              event.stopPropagation();
              closeSearchDialog();
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
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
          {renderSearchResults()}
        </DialogContent>
      </Dialog>

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
