import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Autocomplete,
  Avatar,
  Badge,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Box,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  useTheme,
  useMediaQuery,
  Dialog,
  InputAdornment,
  ListItemButton,
  ListItemText,
  Snackbar,
  Alert,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LoginIcon from "@mui/icons-material/Login";
import MenuIcon from "@mui/icons-material/Menu";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import FeedbackOutlinedIcon from "@mui/icons-material/FeedbackOutlined";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import { FeedbackDialog } from "../Feedback/FeedbackDialog";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLocations } from "../hooks/useLocations";
import { useAuth } from "../hooks/useAuth";
import { ApiService, LocationCombinationOption } from "../../services/apiService";
import { LocationPicker } from "../LocationPicker/LocationPicker";
import { resolveDefaultFamilyTreePath } from "../../utils/defaultFamilyTreeNavigation";
import { setPostLoginRedirect } from "../../utils/postLoginRedirect";
import { brand, brandGradient } from "../../theme/brand";

// Nav destinations that require an authenticated user.
const AUTH_REQUIRED_PATHS = new Set<string>(["/business"]);

interface HeaderProps {
  /** Locked mode: show only the brand (no nav, location picker, or account menu). */
  locked?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ locked = false }) => {
  console.log("Header: Rendering");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [linkedPersonPhoto, setLinkedPersonPhoto] = useState<string>("");
  const [avatarMenuAnchorEl, setAvatarMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [actionableRequestCount, setActionableRequestCount] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSnackbarOpen, setFeedbackSnackbarOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedLocation, setSelectedLocation, locations } = useLocations();
  const { currentUser, userProfile, logout, isSuperAdmin } = useAuth();
  // Full hierarchy option for the selected location (village, district, state).
  const [headerLocationOption, setHeaderLocationOption] =
    useState<LocationCombinationOption | null>(null);

  const applyLocation = useCallback(
    (option: LocationCombinationOption | null) => {
      setHeaderLocationOption(option);
      setSelectedLocation(option?.locationId || "");
    },
    [setSelectedLocation],
  );

  // Resolve the selected id (e.g. auto-selected default) to its full hierarchy label.
  useEffect(() => {
    if (!selectedLocation) {
      setHeaderLocationOption(null);
      return;
    }
    if (headerLocationOption?.locationId === selectedLocation) return;
    let active = true;
    ApiService.searchLocationCombinations({ locationId: selectedLocation, limit: 1 })
      .then((rows) => {
        if (active) setHeaderLocationOption(rows[0] || null);
      })
      .catch(() => {
        /* leave label empty on failure */
      });
    return () => {
      active = false;
    };
  }, [selectedLocation, headerLocationOption?.locationId]);

  useEffect(() => {
    let active = true;

    const loadLinkedPersonPhoto = async () => {
      if (!userProfile?.peopleId) {
        setLinkedPersonPhoto("");
        return;
      }

      try {
        const person = await ApiService.getPersonById(userProfile.peopleId);
        if (!active) return;
        setLinkedPersonPhoto((person as any)?.photoUrl || "");
      } catch (error) {
        if (!active) return;
        console.warn("Failed to load linked person photo:", error);
        setLinkedPersonPhoto("");
      }
    };

    loadLinkedPersonPhoto();
    return () => {
      active = false;
    };
  }, [userProfile?.peopleId]);

  useEffect(() => {
    let active = true;

    const loadActionableRequests = async () => {
      if (!currentUser) {
        setActionableRequestCount(0);
        return;
      }

      try {
        const rows = await ApiService.getActionableLinkRequests();
        if (!active) return;
        setActionableRequestCount((rows || []).length);
      } catch (error) {
        if (!active) return;
        console.warn("Failed to load actionable requests:", error);
        setActionableRequestCount(0);
      }
    };

    void loadActionableRequests();
    window.addEventListener("link-requests-updated", loadActionableRequests);

    return () => {
      active = false;
      window.removeEventListener("link-requests-updated", loadActionableRequests);
    };
  }, [currentUser, location.pathname]);

  const hasPendingActionRequests = actionableRequestCount > 0;
  const isAvatarMenuOpen = Boolean(avatarMenuAnchorEl);

  const handleOpenAvatarMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAvatarMenuAnchorEl(event.currentTarget);
  };

  const handleCloseAvatarMenu = () => {
    setAvatarMenuAnchorEl(null);
  };

  // Feedback is visible to everyone, but only authenticated users can submit.
  // Guests are routed to login first.
  const handleFeedbackClick = () => {
    handleCloseAvatarMenu();
    setDrawerOpen(false);
    if (currentUser) {
      setFeedbackOpen(true);
    } else {
      navigate("/login");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const navLinks = [
    { label: "Home", path: "/", icon: <HomeOutlinedIcon fontSize="small" /> },
    { label: "Business", path: "/business", icon: <BusinessOutlinedIcon fontSize="small" /> },
    // { label: "Heritage", path: "/heritage" },
    { label: "Families", path: "/families", icon: <GroupsOutlinedIcon fontSize="small" /> },
    { label: "About", path: "/about", icon: <InfoOutlinedIcon fontSize="small" /> },
    // Contact page hidden for now (kept in code, just not linked).
    // { label: "Contact", path: "/contact" },
  ];

  // Add admin link for superadmin
  const allNavLinks = isSuperAdmin()
    ? [
        ...navLinks,
        { label: "Admin", path: "/admin", icon: <AdminPanelSettingsOutlinedIcon fontSize="small" /> },
      ]
    : navLinks;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleNavLinkClick = useCallback(
    async (path: string) => {
      // Auth-gated destinations: send guests to login and remember where they
      // were headed so they land back here after login (and onboarding).
      if (AUTH_REQUIRED_PATHS.has(path) && !currentUser) {
        setPostLoginRedirect(path);
        navigate("/login", { state: { from: { pathname: path } } });
        return;
      }

      if (path === "/families" && currentUser) {
        navigate(await resolveDefaultFamilyTreePath());
        return;
      }

      navigate(path);
    },
    [currentUser, navigate],
  );

  const selectedLocationOption =
    locations.find((location) => location.id === selectedLocation) || null;
  const filteredLocations = useMemo(() => {
    const search = locationSearch.trim().toLowerCase();
    if (!search) return locations;
    return locations.filter((location) =>
      location.name.toLowerCase().includes(search),
    );
  }, [locationSearch, locations]);

  const drawerContent = (
    <Box sx={{ width: 300, p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <IconButton onClick={() => setDrawerOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Location Selector for Mobile */}
      <Box sx={{ mb: 2, px: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => setLocationPickerOpen(true)}
          sx={{ justifyContent: "flex-start", textTransform: "none" }}
        >
          {headerLocationOption?.label ||
            selectedLocationOption?.name ||
            (locations.length === 0 ? "Loading locations..." : "Select Location")}
        </Button>
      </Box>

      <List>
        {allNavLinks.map((link) => (
          <ListItem key={link.path}>
            <Button
              fullWidth
              variant={isActive(link.path) ? "contained" : "outlined"}
              startIcon={link.icon}
              sx={{ justifyContent: "flex-start" }}
              onClick={() => {
                setDrawerOpen(false);
                void handleNavLinkClick(link.path);
              }}
            >
              {link.label}
            </Button>
          </ListItem>
        ))}
      </List>

      {/* Auth Section for Mobile */}
      <Box sx={{ px: 2, pt: 2, borderTop: 1, borderColor: "divider", mt: 2 }}>
        {currentUser ? (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 2,
              }}
            >
              <Avatar
                src={linkedPersonPhoto || undefined}
                sx={{ width: 32, height: 32 }}
              >
                {userProfile?.displayName?.charAt(0) || "U"}
              </Avatar>
              <Box>
                <Typography variant="body2" noWrap fontWeight={600}>
                  {userProfile?.displayName || "User"}
                </Typography>
                {userProfile?.role && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ fontWeight: 600, mt: 0.25 }}
                  >
                    {userProfile.role === "superadmin"
                      ? "Super Admin"
                      : "Admin"}
                  </Typography>
                )}
              </Box>
            </Box>
            <List disablePadding sx={{ mb: 2 }}>
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  to="/requests"
                  onClick={() => setDrawerOpen(false)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        Requests
                        {hasPendingActionRequests && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: "error.main",
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      hasPendingActionRequests
                        ? `${actionableRequestCount} pending request${actionableRequestCount === 1 ? "" : "s"}`
                        : "No pending requests"
                    }
                  />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  to="/profile"
                  onClick={() => setDrawerOpen(false)}
                >
                  <ListItemText primary="Profile" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={handleFeedbackClick}>
                  <ListItemText primary="Feedback" />
                </ListItemButton>
              </ListItem>
            </List>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={() => {
                handleLogout();
                setDrawerOpen(false);
              }}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
            >
              Logout
            </Button>
          </>
        ) : (
          <>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FeedbackOutlinedIcon />}
              onClick={handleFeedbackClick}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                py: 1,
                mb: 1.5,
              }}
            >
              Feedback
            </Button>
            <Button
              fullWidth
              variant="contained"
              disableElevation
              startIcon={<LoginIcon />}
              component={Link}
              to="/login"
              onClick={() => setDrawerOpen(false)}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                py: 1,
                color: "#fff",
                background: brandGradient,
                "&:hover": { background: brandGradient },
              }}
            >
              Login
            </Button>
          </>
        )}
      </Box>
    </Box>
  );

  // Locked mode (e.g. blocked account): brand only, no links or functionality.
  if (locked) {
    return (
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{
          bgcolor: "#ffffff",
          color: "#0f172a",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: { xs: 38, md: 42 },
                height: { xs: 38, md: 42 },
                p: "5px",
                borderRadius: 2.5,
                overflow: "hidden",
                backgroundColor: "#ffffff",
              }}
            >
              <img
                src="/favic_no_background.png"
                alt="Kinvia"
                style={{ width: "100%", height: "100%", display: "block" }}
              />
            </Box>
            <Typography variant="h6" component="h1" sx={{ m: 0, fontWeight: 700 }}>
              Kinvia
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>
    );
  }

  return (
    <>
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{
          bgcolor: "#ffffff",
          color: "#0f172a",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar sx={{ px: { xs: 2, md: 2.5 }, gap: 1 }}>
          <Box
            component={Link}
            to="/"
            sx={{
              flexGrow: 0,
              flexShrink: 0,
              mr: 1,
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              textDecoration: "none",
              color: "inherit",
              borderRadius: 1,
              "&:hover": {
                opacity: 0.85,
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: { xs: 38, md: 42 },
                height: { xs: 38, md: 42 },
                p: "5px",
                borderRadius: 2.5,
                overflow: "hidden",
                boxShadow: "none",
                backgroundColor: "#ffffff",
              }}
            >
              <img
                src="/favic_no_background.png"
                alt="Kinvia"
                style={{ width: "100%", height: "100%", display: "block" }}
              />
            </Box>
            <Box>
              <Typography
                variant="h6"
                component="h1"
                sx={{ m: 0, fontWeight: 700 }}
              >
                Kinvia
              </Typography>
            </Box>
          </Box>

          {!isMobile && (
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                gap: 0.5,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {allNavLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <Button
                    key={link.path}
                    color="inherit"
                    startIcon={link.icon}
                    onClick={() => {
                      void handleNavLinkClick(link.path);
                    }}
                    sx={{
                      px: 1.75,
                      borderRadius: 2,
                      textTransform: "none",
                      fontSize: 15,
                      fontWeight: active ? 700 : 500,
                      color: active ? brand.primary : brand.slate,
                      position: "relative",
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        left: 12,
                        right: 12,
                        bottom: 6,
                        height: 2,
                        borderRadius: 2,
                        bgcolor: brand.primary,
                        transform: active ? "scaleX(1)" : "scaleX(0)",
                        transformOrigin: "center",
                        transition: "transform 180ms ease",
                      },
                      "&:hover": {
                        color: brand.primary,
                        bgcolor: brand.primarySoft,
                      },
                    }}
                  >
                    {link.label}
                  </Button>
                );
              })}
            </Box>
          )}

          {/* Location Selector */}
          {!isMobile && (
            <Box sx={{ minWidth: 240, flexShrink: 0, ml: 1 }}>
              <LocationPicker
                value={headerLocationOption}
                onChange={applyLocation}
                label=""
                placeholder="Search location"
                size="small"
                withTreesOnly
              />
            </Box>
          )}

          {/* Auth Buttons */}
          {!isMobile && (
            <Box sx={{ ml: 1, flexShrink: 0 }}>
              {currentUser ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Button
                    color="inherit"
                    onClick={handleOpenAvatarMenu}
                    sx={{
                      textTransform: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      pl: 0.75,
                      pr: 1.25,
                      py: 0.5,
                      borderRadius: 999,
                      border: "1px solid",
                      borderColor: brand.border,
                      bgcolor: "#fff",
                      transition: "border-color 160ms ease, box-shadow 160ms ease",
                      "&:hover": {
                        borderColor: brand.primary,
                        bgcolor: brand.primarySoft,
                        boxShadow: "0 2px 10px rgba(15,118,110,0.12)",
                      },
                    }}
                  >
                    <Badge
                      color="error"
                      overlap="circular"
                      badgeContent={hasPendingActionRequests ? actionableRequestCount : 0}
                    >
                      <Avatar
                        src={linkedPersonPhoto || undefined}
                        sx={{ width: 30, height: 30 }}
                      >
                        {userProfile?.displayName?.charAt(0) || "U"}
                      </Avatar>
                    </Badge>
                    <Typography variant="body2" fontWeight={600} sx={{ textAlign: "left" }}>
                      {userProfile?.displayName || "User"}
                    </Typography>
                    <ArrowDropDownIcon
                      sx={{
                        fontSize: 22,
                        color: "text.secondary",
                        transition: "transform 0.2s",
                        transform: isAvatarMenuOpen ? "rotate(180deg)" : "none",
                      }}
                    />
                  </Button>
                  <Menu
                    anchorEl={avatarMenuAnchorEl}
                    open={isAvatarMenuOpen}
                    onClose={handleCloseAvatarMenu}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                  >
                    <MenuItem
                      onClick={() => {
                        handleCloseAvatarMenu();
                        navigate("/requests");
                      }}
                    >
                      <NotificationsOutlinedIcon fontSize="small" sx={{ mr: 1.25 }} />
                      Requests
                      {hasPendingActionRequests ? ` (${actionableRequestCount})` : ""}
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleCloseAvatarMenu();
                        navigate("/profile");
                      }}
                    >
                      <PersonOutlineIcon fontSize="small" sx={{ mr: 1.25 }} />
                      Profile
                    </MenuItem>
                    <MenuItem onClick={handleFeedbackClick}>
                      <FeedbackOutlinedIcon fontSize="small" sx={{ mr: 1.25 }} />
                      Feedback
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleCloseAvatarMenu();
                        handleLogout();
                      }}
                      sx={{ color: "error.main", fontWeight: 600 }}
                    >
                      <LogoutIcon fontSize="small" sx={{ mr: 1.25 }} />
                      Logout
                    </MenuItem>
                  </Menu>
                </Box>
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Button
                    color="inherit"
                    startIcon={<FeedbackOutlinedIcon />}
                    onClick={handleFeedbackClick}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      borderRadius: 999,
                      px: 1.5,
                      color: brand.slate,
                      "&:hover": {
                        color: brand.primary,
                        bgcolor: brand.primarySoft,
                      },
                    }}
                  >
                    Feedback
                  </Button>
                  <Button
                    startIcon={<LoginIcon />}
                    component={Link}
                    to="/login"
                    variant="contained"
                    disableElevation
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: 999,
                      px: 2.25,
                      py: 0.75,
                      color: "#fff",
                      background: brandGradient,
                      boxShadow: "0 4px 14px rgba(15,118,110,0.28)",
                      transition: "transform 160ms ease, box-shadow 160ms ease",
                      "&:hover": {
                        background: brandGradient,
                        boxShadow: "0 6px 18px rgba(15,118,110,0.38)",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    Login
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {isMobile && (
            <>
              <Box sx={{ flexGrow: 1, px: 1, minWidth: 0, display: "flex", justifyContent: "flex-end" }}>
                <Button
                  color="inherit"
                  variant="outlined"
                  startIcon={<LocationOnIcon fontSize="small" />}
                  onClick={() => setLocationPickerOpen(true)}
                  sx={{
                    textTransform: "none",
                    borderColor: "rgba(15,23,42,0.2)",
                    color: "#0f172a",
                    // Give guests room for the Login button next to it.
                    minWidth: currentUser ? 150 : 96,
                    maxWidth: currentUser ? 220 : 150,
                    justifyContent: "flex-start",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    "&:hover": {
                      borderColor: brand.primary,
                      backgroundColor: brand.primarySoft,
                    },
                  }}
                >
                  <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                    {locations.find((v) => v.id === selectedLocation)?.name ||
                      (locations.length === 0 ? "Loading..." : "Select Location")}
                  </Box>
                </Button>
              </Box>
              {currentUser ? (
                <IconButton
                  color="inherit"
                  edge="end"
                  onClick={() => setDrawerOpen(!drawerOpen)}
                  sx={{ p: 0.25, ml: 1 }}
                >
                  <Badge
                    color="error"
                    overlap="circular"
                    variant={hasPendingActionRequests ? "dot" : undefined}
                  >
                    <Avatar
                      src={linkedPersonPhoto || undefined}
                      sx={{
                        width: 34,
                        height: 34,
                        border: "1px solid rgba(15,23,42,0.12)",
                        bgcolor: "#f8fafc",
                        color: "#0f172a",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {(userProfile?.displayName || currentUser?.email || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </Avatar>
                  </Badge>
                </IconButton>
              ) : (
                <>
                  {/* Guests: an explicit Login CTA (so it's discoverable without
                      opening the menu) plus a clear menu button for nav. */}
                  <Button
                    variant="contained"
                    size="small"
                    disableElevation
                    startIcon={<LoginIcon fontSize="small" />}
                    component={Link}
                    to="/login"
                    sx={{
                      ml: 1,
                      textTransform: "none",
                      fontWeight: 700,
                      borderRadius: 999,
                      px: 1.5,
                      whiteSpace: "nowrap",
                      color: "#fff",
                      background: brandGradient,
                      "&:hover": { background: brandGradient },
                    }}
                  >
                    Login
                  </Button>
                  <IconButton
                    color="inherit"
                    edge="end"
                    aria-label="Open menu"
                    onClick={() => setDrawerOpen(!drawerOpen)}
                    sx={{ p: 0.5, ml: 0.5 }}
                  >
                    <MenuIcon />
                  </IconButton>
                </>
              )}
            </>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {drawerContent}
      </Drawer>

      <Dialog
        fullScreen
        open={locationPickerOpen}
        onClose={() => {
          setLocationSearch("");
          setLocationPickerOpen(false);
        }}
      >
        <AppBar position="static" color="primary">
          <Toolbar>
            <Typography sx={{ flexGrow: 1 }} variant="h6">
              Select Location
            </Typography>
            <IconButton
              color="inherit"
              onClick={() => {
                setLocationSearch("");
                setLocationPickerOpen(false);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 2 }}>
          <LocationPicker
            value={headerLocationOption}
            onChange={(option) => {
              applyLocation(option);
              if (option) setLocationPickerOpen(false);
            }}
            autoFocus
            withTreesOnly
          />
        </Box>
      </Dialog>

      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmitted={() => setFeedbackSnackbarOpen(true)}
      />

      <Snackbar
        open={feedbackSnackbarOpen}
        autoHideDuration={5000}
        onClose={() => setFeedbackSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setFeedbackSnackbarOpen(false)}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          Thanks for your feedback!
        </Alert>
      </Snackbar>
    </>
  );
};

export default Header;
