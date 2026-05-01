import React, { useEffect, useMemo, useState } from "react";
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
  ListItemButton,
  ListItemText,
  TextField,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useVillage } from "../hooks/useVillage";
import { useAuth } from "../hooks/useAuth";
import { ApiService } from "../../services/apiService";

export const Header: React.FC = () => {
  console.log("Header: Rendering");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [villagePickerOpen, setVillagePickerOpen] = useState(false);
  const [villageSearch, setVillageSearch] = useState("");
  const [linkedPersonPhoto, setLinkedPersonPhoto] = useState<string>("");
  const [avatarMenuAnchorEl, setAvatarMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [actionableRequestCount, setActionableRequestCount] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedVillage, setSelectedVillage, villages } = useVillage();
  const { currentUser, userProfile, logout, isSuperAdmin } = useAuth();

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

  const selectedVillageOption =
    villages.find((village) => village.id === selectedVillage) || null;
  const filteredVillages = useMemo(() => {
    const search = villageSearch.trim().toLowerCase();
    if (!search) return villages;
    return villages.filter((village) =>
      village.name.toLowerCase().includes(search),
    );
  }, [villageSearch, villages]);

  const drawerContent = (
    <Box sx={{ width: 300, p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <IconButton onClick={() => setDrawerOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Village Selector for Mobile */}
      <Box sx={{ mb: 2, px: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => setVillagePickerOpen(true)}
          sx={{ justifyContent: "flex-start", textTransform: "none" }}
        >
          {selectedVillageOption?.name ||
            (villages.length === 0 ? "Loading villages..." : "Select Village")}
        </Button>
      </Box>

      <List>
        {allNavLinks.map((link) => (
          <ListItem key={link.path}>
            <Button
              component={Link}
              to={link.path}
              fullWidth
              variant={isActive(link.path) ? "contained" : "outlined"}
              onClick={() => setDrawerOpen(false)}
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
      <AppBar position="static" color="primary">
        <Toolbar>
          <Box
            sx={{
              flexGrow: 0,
              mr: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.25,
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
                boxShadow: "0 10px 24px rgba(7, 28, 68, 0.22)",
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
                  component={Link}
                  to={link.path}
                  color="inherit"
                  sx={{
                    fontWeight: isActive(link.path) ? "bold" : "normal",
                    borderBottom: isActive(link.path)
                      ? "2px solid white"
                      : "none",
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>
          )}

          {/* Village Selector */}
          {!isMobile && (
            <Autocomplete
              options={villages}
              value={selectedVillageOption}
              onChange={(_event, value) => setSelectedVillage(value?.id || "")}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText={
                villages.length === 0 ? "Loading villages..." : "No villages found"
              }
              sx={{
                minWidth: 240,
                ml: 2,
                "& .MuiOutlinedInput-root": {
                  color: "white",
                  "& fieldset": {
                    borderColor: "rgba(255, 255, 255, 0.5)",
                  },
                  "&:hover fieldset": {
                    borderColor: "rgba(255, 255, 255, 0.8)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "white",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: "rgba(255,255,255,0.8)",
                },
                "& .MuiSvgIcon-root": {
                  color: "white",
                },
                "& .MuiAutocomplete-input::placeholder": {
                  color: "rgba(255,255,255,0.8)",
                  opacity: 1,
                },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder={villages.length === 0 ? "Loading..." : "Search village"}
                />
              )}
            />
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
                    <Box sx={{ textAlign: "left" }}>
                      <Typography variant="body2" fontWeight={600}>
                        {userProfile?.displayName || "User"}
                      </Typography>
                      {userProfile?.role && (
                        <Typography
                          variant="caption"
                          color="rgba(255, 255, 255, 0.7)"
                          display="block"
                          sx={{ fontWeight: 600, mt: 0.25 }}
                        >
                          {userProfile.role === "superadmin"
                            ? "Super Admin"
                            : "Admin"}
                        </Typography>
                      )}
                    </Box>
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
                  </Menu>
                  <Button
                    color="inherit"
                    startIcon={<LogoutIcon />}
                    onClick={handleLogout}
                    variant="outlined"
                    size="small"
                  >
                    Logout
                  </Button>
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
                  onClick={() => setVillagePickerOpen(true)}
                  sx={{
                    textTransform: "none",
                    borderColor: "rgba(255,255,255,0.55)",
                    color: "white",
                    minWidth: 150,
                    maxWidth: 220,
                    justifyContent: "flex-start",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    "&:hover": {
                      borderColor: "white",
                      backgroundColor: "rgba(255,255,255,0.08)",
                    },
                  }}
                >
                  {villages.find((v) => v.id === selectedVillage)?.name ||
                    (villages.length === 0 ? "Loading..." : "Select Village")}
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
                      border: "2px solid rgba(255,255,255,0.55)",
                      bgcolor: "rgba(255,255,255,0.18)",
                      color: "white",
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
        open={villagePickerOpen}
        onClose={() => {
          setVillageSearch("");
          setVillagePickerOpen(false);
        }}
      >
        <AppBar position="static" color="primary">
          <Toolbar>
            <Typography sx={{ flexGrow: 1 }} variant="h6">
              Select Village
            </Typography>
            <IconButton
              color="inherit"
              onClick={() => {
                setVillageSearch("");
                setVillagePickerOpen(false);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Search village"
            value={villageSearch}
            onChange={(e) => setVillageSearch(e.target.value)}
            sx={{ mb: 2 }}
          />
          <List>
            {villages.length === 0 && (
              <ListItem>
                <ListItemText primary="Loading villages..." />
              </ListItem>
            )}
            {villages.length > 0 && filteredVillages.length === 0 && (
              <ListItem>
                <ListItemText primary="No villages found" />
              </ListItem>
            )}
            {filteredVillages.map((village) => (
              <ListItem key={village.id} disablePadding>
                <ListItemButton
                  selected={selectedVillage === village.id}
                  onClick={() => {
                    setSelectedVillage(village.id);
                    setVillageSearch("");
                    setVillagePickerOpen(false);
                  }}
                >
                  <ListItemText primary={village.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Dialog>
    </>
  );
};

export default Header;
