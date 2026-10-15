import React, { useCallback, useEffect, useState } from "react";
import {
  AppBar,
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
  ListItemButton,
  ListItemText,
  Snackbar,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LoginIcon from "@mui/icons-material/Login";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import FeedbackOutlinedIcon from "@mui/icons-material/FeedbackOutlined";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import { FeedbackDialog } from "../Feedback/FeedbackDialog";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSkipOnboarding } from "../hooks/useSkipOnboarding";
import { useAuth } from "../hooks/useAuth";
import InstallMobileOutlinedIcon from "@mui/icons-material/InstallMobileOutlined";
import { promptInstall, useInstallPrompt } from "../../utils/pwaInstall";
import { canOfferInstall, InstallGuideDialog } from "../HomePage/InstallAppCard";
import { ApiService } from "../../services/apiService";
import { resolveDefaultFamilyTreePath } from "../../utils/defaultFamilyTreeNavigation";
import { setPostLoginRedirect } from "../../utils/postLoginRedirect";
import { isOverlayEntry, useCloseOnBack } from "../hooks/useCloseOnBack";
import { brand, brandGradient } from "../../theme/brand";

// Nav destinations that require an authenticated user.
const AUTH_REQUIRED_PATHS = new Set<string>(["/business"]);

/** The nav pages a signed-out visitor can open. */
const PUBLIC_NAV_PATHS = new Set<string>(["/", "/locations", "/about"]);

interface HeaderProps {
  /** Locked mode: show only the brand (no nav, location picker, or account menu). */
  locked?: boolean;
}

/** History marker for the ☰ menu's entry (see useCloseOnBack). */
const DRAWER_HISTORY_MARKER = "kinviaNavDrawer";

export const Header: React.FC<HeaderProps> = ({ locked = false }) => {
  console.log("Header: Rendering");
  const [drawerOpen, setDrawerOpen] = useState(false);
  // "Install app" in the menu: the browser's own dialog where it has one, the
  // how-to (iOS, in-app browsers…) where it doesn't. Gone once installed.
  const installState = useInstallPrompt();
  const showInstall = canOfferInstall(installState);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const handleInstallClick = () => {
    setDrawerOpen(false);
    if (installState.canPrompt) {
      // Called straight from the tap: the browser only opens its install
      // dialog in response to a user gesture.
      void promptInstall();
    } else {
      setInstallGuideOpen(true);
    }
  };
  // The phone's Back closes the menu instead of leaving the page behind it.
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  useCloseOnBack(drawerOpen, closeDrawer, DRAWER_HISTORY_MARKER);
  const [linkedPersonPhoto, setLinkedPersonPhoto] = useState<string>("");
  const [avatarMenuAnchorEl, setAvatarMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [actionableRequestCount, setActionableRequestCount] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSnackbarOpen, setFeedbackSnackbarOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();
  /**
   * Onboarding gets a stripped header.
   *
   * The flow's whole job is to get three answers before the app means anything;
   * a full nav bar invites the user to wander off mid-way into pages that have
   * nothing in them yet. Logo, an escape hatch, and their account — nothing
   * else.
   */
  const isOnboarding = location.pathname.startsWith("/onboarding");
  // On the login page itself the header offers neither a way in (you're there)
  // nor the menu — the page is the one task in front of the user.
  const isLoginPage = location.pathname === "/login";
  const { skip: skipOnboarding, skipping: skippingOnboarding } = useSkipOnboarding();
  const navigate = useNavigate();
  const { currentUser, userProfile, logout, isSuperAdmin, initialized, hadSession } = useAuth();
  // Match the homepage: don't paint a logged-out header for a returning user
  // and swap it for their avatar once Firebase restores the session. Only the
  // rendered shell uses this hint — actions still key off the real `currentUser`.
  const showAuthed = initialized ? !!currentUser : hadSession;
  // Full hierarchy option for the selected location (village, district, state).

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
    { label: "Explore", path: "/locations", icon: <PlaceOutlinedIcon fontSize="small" /> },
    { label: "Photos", path: "/photos", icon: <PhotoLibraryOutlinedIcon fontSize="small" /> },
    { label: "About", path: "/about", icon: <InfoOutlinedIcon fontSize="small" /> },
    // Contact page hidden for now (kept in code, just not linked).
    // { label: "Contact", path: "/contact" },
  ];

  // Add admin link for superadmin.
  //
  // Emptied during onboarding so the links disappear from the drawer as well as
  // the bar — otherwise the mobile menu would still offer every destination the
  // stripped header exists to withhold.
  //
  // Signed out, only the pages a visitor can actually open: Business, Families
  // and Photos are all sign-in walls for them, so offering them just leads to
  // the login page.
  const allNavLinks = isOnboarding
    ? []
    : !showAuthed
      ? navLinks.filter((link) => PUBLIC_NAV_PATHS.has(link.path))
      : isSuperAdmin()
      ? [
          ...navLinks,
          { label: "Admin", path: "/admin", icon: <AdminPanelSettingsOutlinedIcon fontSize="small" /> },
        ]
      : navLinks;
  // The menu has room for one more public page than the desktop bar.
  const drawerNavLinks =
    !showAuthed && !isOnboarding
      ? [...allNavLinks, { label: "FAQ", path: "/faq", icon: <HelpOutlineIcon fontSize="small" /> }]
      : allNavLinks;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleNavLinkClick = useCallback(
    async (path: string) => {
      // Picked from the open menu: the destination takes the menu's history
      // entry, so Back from it returns to the page the menu was opened on
      // rather than to a dead copy of it.
      const replace = isOverlayEntry(DRAWER_HISTORY_MARKER);

      // Auth-gated destinations: send guests to login and remember where they
      // were headed so they land back here after login (and onboarding).
      if (AUTH_REQUIRED_PATHS.has(path) && !currentUser) {
        setPostLoginRedirect(path);
        navigate("/login", { state: { from: { pathname: path } }, replace });
        return;
      }

      // Phones choose a tree from the tree list, the same as the Families tab.
      if (path === "/families" && currentUser && !isMobile) {
        const target = await resolveDefaultFamilyTreePath();
        // Checked again after the wait: the menu's entry is gone by now.
        navigate(target, { replace: isOverlayEntry(DRAWER_HISTORY_MARKER) });
        return;
      }

      navigate(path, { replace });
    },
    [currentUser, navigate, isMobile],
  );


  const drawerContent = (
    <Box sx={{ width: 300, p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <IconButton onClick={() => setDrawerOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>

      <List>
        {drawerNavLinks.map((link) => (
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
        {showInstall && (
          <ListItem>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<InstallMobileOutlinedIcon fontSize="small" />}
              sx={{ justifyContent: "flex-start" }}
              onClick={handleInstallClick}
            >
              Install app
            </Button>
          </ListItem>
        )}
      </List>

      {/* Auth Section for Mobile */}
      <Box sx={{ px: 2, pt: 2, borderTop: 1, borderColor: "divider", mt: 2 }}>
        {showAuthed ? (
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
                  replace
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
                  replace
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
              sx={{ textTransform: "none", fontWeight: 700 }}
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
              replace
              onClick={() => setDrawerOpen(false)}
              sx={{
                textTransform: "none",
                fontWeight: 700,
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
                // The installed app's icon (manifest logo192/512). It carries
                // its own white margin, so no padding around it here.
                p: 0,
                borderRadius: 2.5,
                overflow: "hidden",
                backgroundColor: "#ffffff",
              }}
            >
              <img
                src="/logo192.png"
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
          {/* Phones: the bottom tabs cover the four main sections; ☰ holds the
              rest. Top-left, where people look for a menu — the avatar alone
              didn't read as one. Carries the pending-requests dot, since
              Requests lives in the drawer. */}
          {isMobile && !isOnboarding && !isLoginPage && (
            <IconButton
              color="inherit"
              edge="start"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: -0.5 }}
            >
              <Badge
                color="error"
                variant="dot"
                invisible={!(showAuthed && hasPendingActionRequests)}
              >
                <MenuIcon />
              </Badge>
            </IconButton>
          )}
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
                // The installed app's icon (manifest logo192/512). It carries
                // its own white margin, so no padding around it here.
                p: 0,
                borderRadius: 2.5,
                overflow: "hidden",
                boxShadow: "none",
                backgroundColor: "#ffffff",
              }}
            >
              <img
                src="/logo192.png"
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

          {!isMobile && !isOnboarding && (
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
                      px: 1.5,
                      py: 0.75,
                      textTransform: "none",
                      fontSize: 14,
                      fontWeight: active ? 600 : 500,
                      whiteSpace: "nowrap",
                      // The current page is a filled pill rather than an
                      // underline: with seven items the underline was the only
                      // thing separating "here" from "not here", and it read as
                      // a hairline rather than a state.
                      color: active ? brand.primaryDark : brand.slate,
                      bgcolor: active ? brand.primarySoft : "transparent",
                      border: "1px solid",
                      borderColor: active ? "rgba(191, 219, 254, 0.9)" : "transparent",
                      transition: "background-color 140ms ease, color 140ms ease",
                      // Icons sit behind the labels: at the same weight and size
                      // as the text, seven of them turned the bar into a row of
                      // competing glyphs. Muted and smaller, they read as
                      // markers for the word next to them.
                      "& .MuiButton-startIcon": {
                        mr: 0.75,
                        ml: 0,
                        color: active ? brand.primary : "#94a3b8",
                        transition: "color 140ms ease",
                      },
                      "& .MuiButton-startIcon .MuiSvgIcon-root": { fontSize: 18 },
                      "&:hover": {
                        color: active ? brand.primaryDark : brand.ink,
                        bgcolor: active ? brand.primarySoft : "#f8fafc",
                        "& .MuiButton-startIcon": {
                          color: active ? brand.primary : brand.slate,
                        },
                      },
                    }}
                  >
                    {link.label}
                  </Button>
                );
              })}
            </Box>
          )}


          {/* Onboarding's only exit, in the header where it stays out of the
              form's way but remains findable on every step. */}
          {isOnboarding && showAuthed && (
            <Box sx={{ ml: "auto", mr: 1.5, flexShrink: 0 }}>
              <Button
                variant="text"
                size="small"
                onClick={() => void skipOnboarding()}
                disabled={skippingOnboarding}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: 13.5,
                  color: brand.slateMuted,
                  "&:hover": { color: brand.ink, bgcolor: "#f8fafc" },
                }}
              >
                {skippingOnboarding ? "Skipping…" : "Skip for now"}
              </Button>
            </Box>
          )}

          {/* Auth Buttons */}
          {!isMobile && (
            <Box sx={{ ml: 1, flexShrink: 0 }}>
              {showAuthed ? (
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
                  {!isLoginPage && (
                    <Button
                      startIcon={<LoginIcon />}
                      component={Link}
                      to="/login"
                      variant="contained"
                      disableElevation
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
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
                  )}
                </Box>
              )}
            </Box>
          )}

          {isMobile && (
            <>
<Box sx={{ flexGrow: 1, minWidth: 0 }} />
              {showAuthed ? (
                <IconButton
                  color="inherit"
                  edge="end"
                  aria-label="Your profile"
                  component={Link}
                  to="/profile"
                  sx={{ p: 0.25, ml: 1 }}
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
                </IconButton>
              ) : (
                <>
                  {/* Guests: an explicit Login CTA, so it's discoverable without
                      opening the menu (☰ is at the top-left). */}
                  {!isLoginPage && (
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
                        px: 1.5,
                        whiteSpace: "nowrap",
                        color: "#fff",
                        background: brandGradient,
                        "&:hover": { background: brandGradient },
                      }}
                    >
                      Login
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        // Slides from the side its ☰ is on.
        anchor={isMobile ? "left" : "right"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {drawerContent}
      </Drawer>

      <InstallGuideDialog
        open={installGuideOpen}
        onClose={() => setInstallGuideOpen(false)}
        platform={installState.platform}
      />


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
