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
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LoginIcon from "@mui/icons-material/Login";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLocations } from "../hooks/useLocations";
import { useAuth } from "../hooks/useAuth";
import { ApiService, LocationCombinationOption } from "../../services/apiService";
import { LocationPicker } from "../LocationPicker/LocationPicker";
import { resolveDefaultFamilyTreePath } from "../../utils/defaultFamilyTreeNavigation";

export const Header: React.FC = () => {
  console.log("Header: Rendering");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [linkedPersonPhoto, setLinkedPersonPhoto] = useState<string>("");
  const [avatarMenuAnchorEl, setAvatarMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [actionableRequestCount, setActionableRequestCount] = useState(0);
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

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "Business", path: "/business" },
    // { label: "Heritage", path: "/heritage" },
    { label: "Families", path: "/families" },
    { label: "Contact", path: "/contact" },
  ];

  // Add admin link for superadmin
  const allNavLinks = isSuperAdmin()
    ? [...navLinks, { label: "Admin", path: "/admin" }]
    : navLinks;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleNavLinkClick = useCallback(
    async (path: string) => {
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
              <Badge
                color="error"
                overlap="circular"
                variant={hasPendingActionRequests ? "dot" : undefined}
              >
                <Avatar
                  src={linkedPersonPhoto || undefined}
                  sx={{ width: 32, height: 32 }}
                >
                  {userProfile?.displayName?.charAt(0) || "U"}
                </Avatar>
              </Badge>
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
                    primary="Requests"
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
            </List>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<LogoutIcon />}
              onClick={() => {
                handleLogout();
                setDrawerOpen(false);
              }}
            >
              Logout
            </Button>
          </>
        ) : (
          <Button
            fullWidth
            variant="contained"
            startIcon={<LoginIcon />}
            component={Link}
            to="/login"
            onClick={() => setDrawerOpen(false)}
          >
            Login
          </Button>
        )}
      </Box>
    </Box>
  );

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
        <Toolbar>
          <Box
            component={Link}
            to="/"
            sx={{
              flexGrow: 0,
              mr: 2,
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
                src="/favicon.png"
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
                gap: 1,
                alignItems: "center",
              }}
            >
              {allNavLinks.map((link) => (
                <Button
                  key={link.path}
                  color="inherit"
                  onClick={() => {
                    void handleNavLinkClick(link.path);
                  }}
                  sx={{
                    fontWeight: isActive(link.path) ? "bold" : "normal",
                    borderBottom: isActive(link.path)
                      ? "2px solid #0d6efd"
                      : "none",
                    color: isActive(link.path) ? "#0d6efd" : "#334155",
                    "&:hover": {
                      bgcolor: "rgba(13,110,253,0.06)",
                    },
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>
          )}

          {/* Location Selector */}
          {!isMobile && (
            <Box sx={{ minWidth: 280, ml: 2 }}>
              <LocationPicker
                value={headerLocationOption}
                onChange={applyLocation}
                label=""
                placeholder="Search location"
                size="small"
              />
            </Box>
          )}

          {/* Auth Buttons */}
          {!isMobile && (
            <Box sx={{ ml: 2 }}>
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
                      mr: 1,
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
                    <MenuItem
                      onClick={() => {
                        handleCloseAvatarMenu();
                        handleLogout();
                      }}
                    >
                      <LogoutIcon fontSize="small" sx={{ mr: 1.25 }} />
                      Logout
                    </MenuItem>
                  </Menu>
                </Box>
              ) : (
                <Button
                  color="inherit"
                  startIcon={<LoginIcon />}
                  component={Link}
                  to="/login"
                  variant="outlined"
                  size="small"
                >
                  Login
                </Button>
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
                    minWidth: 150,
                    maxWidth: 220,
                    justifyContent: "flex-start",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    "&:hover": {
                      borderColor: "#0d6efd",
                      backgroundColor: "rgba(13,110,253,0.06)",
                    },
                  }}
                >
                  <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                    {locations.find((v) => v.id === selectedLocation)?.name ||
                      (locations.length === 0 ? "Loading..." : "Select Location")}
                  </Box>
                </Button>
              </Box>
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
          />
        </Box>
      </Dialog>
    </>
  );
};

export default Header;
