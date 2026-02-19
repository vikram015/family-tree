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
  ClickAwayListener,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SchoolIcon from "@mui/icons-material/School";
import WorkIcon from "@mui/icons-material/Work";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SearchIcon from "@mui/icons-material/Search";
import PeopleIcon from "@mui/icons-material/People";
import BusinessIcon from "@mui/icons-material/Business";
import SettingsIcon from "@mui/icons-material/Settings";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import PersonIcon from "@mui/icons-material/Person";
import StoreIcon from "@mui/icons-material/Store";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchDashboardStatistics,
  selectStatistics,
  selectStatisticsLoading,
} from "../../store/slices/statisticsSlice";
import { SupabaseService } from "../../services/supabaseService";

interface SearchResult {
  id: string;
  name: string;
  type: "person" | "business";
  treeId?: string;
  villageName?: string;
  extra?: string; // e.g. business category or person's father name
}

export const HomePage: React.FC = () => {
  console.log("HomePage: Rendering");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statistics = useAppSelector(selectStatistics);
  const loadingStats = useAppSelector(selectStatisticsLoading);

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    setShowResults(true);
    try {
      const [people, businesses] = await Promise.all([
        SupabaseService.searchPeople(query.trim()),
        SupabaseService.searchBusinesses(query.trim()),
      ]);

      const results: SearchResult[] = [];

      // Map people results
      people.slice(0, 10).forEach((person: any) => {
        results.push({
          id: person.id,
          name: person.name || "Unknown",
          type: "person",
          treeId: person.tree_id,
          extra:
            person.gender === "male"
              ? "Male"
              : person.gender === "female"
                ? "Female"
                : undefined,
        });
      });

      // Map business results
      businesses.slice(0, 5).forEach((biz: any) => {
        const ownerName = biz.people?.name;
        results.push({
          id: biz.id,
          name: biz.name,
          type: "business",
          treeId: biz.people?.tree_id,
          extra: [biz.category, ownerName ? `Owner: ${ownerName}` : null]
            .filter(Boolean)
            .join(" • "),
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
    if (result.treeId) {
      navigate(`/families?tree=${result.treeId}`);
    } else if (result.type === "business") {
      navigate("/business");
    }
  };

  // Dispatch Redux action to fetch statistics - no isMounted needed!
  useEffect(() => {
    dispatch(fetchDashboardStatistics());
  }, [dispatch]);
  const features = [
    {
      icon: <AccountTreeIcon sx={{ fontSize: 48, color: "#90C43C" }} />,
      title: "Build Your Family Tree",
      description:
        "Create and visualize your complete family structure with ease. Add members, relationships, and track generations.",
      action: "/families",
      label: "Explore",
    },
    {
      icon: <SchoolIcon sx={{ fontSize: 48, color: "#E6A726" }} />,
      title: "Explore Heritage",
      description:
        "Discover and preserve your family's rich history, cultural heritage, and ancestral stories for future generations.",
      action: "/heritage",
      label: "Learn More",
    },
    {
      icon: <WorkIcon sx={{ fontSize: 48, color: "#7BC65D" }} />,
      title: "Connect Professionals",
      description:
        "Network with family members in business, build professional connections, and collaborate within your family.",
      action: "/business",
      label: "Connect",
    },
  ];

  const steps = [
    {
      number: "1",
      title: "Create Your Profile",
      description: "Start by adding yourself to the family tree",
    },
    {
      number: "2",
      title: "Add Family Members",
      description:
        "Invite and add relatives to build your complete family structure",
    },
    {
      number: "3",
      title: "Build Connections",
      description: "Link relationships and create your family network",
    },
    {
      number: "4",
      title: "Preserve History",
      description: "Document stories, heritage, and preserve for generations",
    },
  ];

  return (
    <>
      <Helmet>
        <title>
          Kinvia - Digital Family Tree Builder | Create Your Family Heritage
          Online
        </title>
        <meta
          name="description"
          content="Build and preserve your family history with Kinvia. Create interactive family trees, document relationships, add photos and custom details. Free online genealogy tool for Indian families."
        />
        <meta
          name="keywords"
          content="family tree, genealogy, family history, family tree maker, Indian family tree, वंशावली, परिवार वृक्ष, family heritage, ancestry, lineage"
        />
        <meta
          property="og:title"
          content="Kinvia - Digital Family Tree Builder"
        />
        <meta
          property="og:description"
          content="Build and preserve your family history with Kinvia. Create interactive family trees online."
        />
      </Helmet>
      {/* Hero Section */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #0066cc 0%, #00cc99 100%)",
          color: "white",
          py: 8,
          textAlign: "center",
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h2" gutterBottom sx={{ fontWeight: 700 }}>
            Welcome to Kinvia
          </Typography>
          <Typography variant="h5" gutterBottom sx={{ mb: 4, fontWeight: 300 }}>
            Preserve, Connect, and Celebrate Your Family Legacy
          </Typography>

          {/* Search Bar */}
          <ClickAwayListener onClickAway={() => setShowResults(false)}>
            <Box
              sx={{ mb: 4, maxWidth: 600, mx: "auto", position: "relative" }}
            >
              <TextField
                fullWidth
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
                      <SearchIcon sx={{ color: "#0066cc", mr: 1 }} />
                    </InputAdornment>
                  ),
                  endAdornment: isSearching ? (
                    <InputAdornment position="end">
                      <CircularProgress size={20} />
                    </InputAdornment>
                  ) : null,
                }}
                sx={{
                  backgroundColor: "white",
                  borderRadius: 1,
                  "& .MuiOutlinedInput-root": {
                    fontSize: "1rem",
                  },
                }}
              />
              {showResults && (
                <Paper
                  elevation={8}
                  sx={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 1300,
                    maxHeight: 400,
                    overflow: "auto",
                    mt: 0.5,
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
                            ) : (
                              <StoreIcon color="secondary" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={result.name}
                            secondary={result.extra || undefined}
                            primaryTypographyProps={{ fontWeight: 500 }}
                            secondaryTypographyProps={{ fontSize: "0.75rem" }}
                          />
                          <Chip
                            label={
                              result.type === "person" ? "Person" : "Business"
                            }
                            size="small"
                            color={
                              result.type === "person" ? "primary" : "secondary"
                            }
                            variant="outlined"
                            sx={{ ml: 1 }}
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
              )}
            </Box>
          </ClickAwayListener>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
          >
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/families"
              sx={{
                bgcolor: "white",
                color: "#0066cc",
                fontWeight: "bold",
                "&:hover": { bgcolor: "#f0f0f0" },
              }}
            >
              Build Your Tree
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={Link}
              to="/heritage"
              sx={{
                borderColor: "white",
                color: "white",
                fontWeight: "bold",
                "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
              }}
            >
              Explore Heritage
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ textAlign: "center", fontWeight: 700, mb: 6 }}
        >
          What Kinvia Offers
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "1fr 1fr 1fr",
            },
            gap: 3,
            mb: 6,
          }}
        >
          {features.map((feature, index) => (
            <Card
              key={index}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                boxShadow: 2,
                transition: "transform 0.3s, boxShadow 0.3s",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {feature.description}
                </Typography>
              </CardContent>
              <Box sx={{ p: 2, pt: 0 }}>
                <Button
                  component={Link}
                  to={feature.action}
                  endIcon={<ArrowForwardIcon />}
                  sx={{ color: "#0066cc", fontWeight: "bold" }}
                >
                  {feature.label}
                </Button>
              </Box>
            </Card>
          ))}
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* Dashboard Statistics */}
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h4"
            gutterBottom
            sx={{ textAlign: "center", fontWeight: 700, mb: 6 }}
          >
            Kinvia by the Numbers
          </Typography>

          {loadingStats ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr 1fr",
                  md: "1fr 1fr 1fr 1fr",
                },
                gap: 3,
              }}
            >
              {/* Total People */}
              <Card
                sx={{
                  textAlign: "center",
                  transition: "transform 0.3s, boxShadow 0.3s",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ py: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      mb: 2,
                    }}
                  >
                    <PeopleIcon sx={{ fontSize: 48, color: "#0066cc" }} />
                  </Box>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: "#0066cc", mb: 1 }}
                  >
                    {statistics?.total_people || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Family Members
                  </Typography>
                </CardContent>
              </Card>

              {/* Total Trees */}
              <Card
                sx={{
                  textAlign: "center",
                  transition: "transform 0.3s, boxShadow 0.3s",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ py: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      mb: 2,
                    }}
                  >
                    <AccountTreeIcon sx={{ fontSize: 48, color: "#90C43C" }} />
                  </Box>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: "#90C43C", mb: 1 }}
                  >
                    {statistics?.total_trees || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Family Trees
                  </Typography>
                </CardContent>
              </Card>

              {/* Total Villages */}
              <Card
                sx={{
                  textAlign: "center",
                  transition: "transform 0.3s, boxShadow 0.3s",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ py: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      mb: 2,
                    }}
                  >
                    <LocationCityIcon sx={{ fontSize: 48, color: "#E6A726" }} />
                  </Box>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: "#E6A726", mb: 1 }}
                  >
                    {statistics?.total_villages || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Villages
                  </Typography>
                </CardContent>
              </Card>

              {/* Total Businesses */}
              <Card
                sx={{
                  textAlign: "center",
                  transition: "transform 0.3s, boxShadow 0.3s",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ py: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      mb: 2,
                    }}
                  >
                    <BusinessIcon sx={{ fontSize: 48, color: "#7BC65D" }} />
                  </Box>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: "#7BC65D", mb: 1 }}
                  >
                    {statistics?.total_businesses || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Businesses
                  </Typography>
                </CardContent>
              </Card>

              {/* Total Professions */}
              <Card
                sx={{
                  textAlign: "center",
                  transition: "transform 0.3s, boxShadow 0.3s",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ py: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      mb: 2,
                    }}
                  >
                    <SettingsIcon sx={{ fontSize: 48, color: "#E74C3C" }} />
                  </Box>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: "#E74C3C", mb: 1 }}
                  >
                    {statistics?.total_professions || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Professions
                  </Typography>
                </CardContent>
              </Card>

              {/* People with Professions */}
              <Card
                sx={{
                  textAlign: "center",
                  transition: "transform 0.3s, boxShadow 0.3s",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ py: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      mb: 2,
                    }}
                  >
                    <WorkIcon sx={{ fontSize: 48, color: "#F39C12" }} />
                  </Box>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: "#F39C12", mb: 1 }}
                  >
                    {statistics?.people_with_professions || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    People with Professions
                  </Typography>
                </CardContent>
              </Card>

              {/* Total Professions Assigned */}
              <Card
                sx={{
                  textAlign: "center",
                  transition: "transform 0.3s, boxShadow 0.3s",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ py: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      mb: 2,
                    }}
                  >
                    <SchoolIcon sx={{ fontSize: 48, color: "#9B59B6" }} />
                  </Box>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: "#9B59B6", mb: 1 }}
                  >
                    {statistics?.total_professions_assigned || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Professions Assigned
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* About Kinvia */}
        <Box sx={{ mb: 8, textAlign: "center" }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            About Kinvia
          </Typography>
          <Typography
            variant="body1"
            paragraph
            sx={{ maxWidth: 600, mx: "auto" }}
          >
            Kinvia is a modern platform dedicated to preserving family heritage
            and strengthening family connections. We believe that every family
            has a unique story worth preserving for future generations.
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: 600, mx: "auto" }}>
            Whether you're documenting your lineage, celebrating your cultural
            heritage, or connecting with family members professionally, Kinvia
            provides the tools you need to build and maintain your family
            network.
          </Typography>
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* How It Works */}
        <Box>
          <Typography
            variant="h4"
            gutterBottom
            sx={{ textAlign: "center", fontWeight: 700, mb: 6 }}
          >
            Getting Started with Kinvia
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "1fr 1fr 1fr 1fr",
              },
              gap: 3,
            }}
          >
            {steps.map((step, index) => (
              <Box key={index} sx={{ textAlign: "center" }}>
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #90C43C, #7BC65D)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 2,
                    color: "white",
                    fontWeight: "bold",
                    fontSize: 24,
                  }}
                >
                  {step.number}
                </Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* Call to Action */}
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            Ready to Start Your Family Journey?
          </Typography>
          <Typography variant="body1" paragraph sx={{ mb: 4 }}>
            Join Kinvia today and begin building your family legacy.
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
          >
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/families"
              sx={{
                background: "linear-gradient(135deg, #90C43C, #7BC65D)",
                fontWeight: "bold",
              }}
            >
              Start Building
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={Link}
              to="/contact"
              sx={{ fontWeight: "bold" }}
            >
              Get in Touch
            </Button>
          </Stack>
        </Box>
      </Container>
    </>
  );
};
