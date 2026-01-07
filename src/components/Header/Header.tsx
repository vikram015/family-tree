import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Box,
  Drawer,
  List,
  ListItem,
  useTheme,
  useMediaQuery,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useVillage } from "../context/VillageContext";
import { useAuth } from "../context/AuthContext";

export const Header: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedVillage, setSelectedVillage, villages } = useVillage();
  const { currentUser, userProfile, logout, isSuperAdmin } = useAuth();

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
    { label: "Heritage", path: "/heritage" },
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

  const drawerContent = (
    <Box sx={{ width: 300, p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <IconButton onClick={() => setDrawerOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Village Selector for Mobile */}
      {villages.length > 0 && (
        <Box sx={{ mb: 2, px: 2 }}>
          <FormControl fullWidth size="small">
            <Select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">Select Village</MenuItem>
              {villages.map((village) => (
                <MenuItem key={village.id} value={village.id}>
                  {village.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <AccountCircleIcon />
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
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                marginLeft: "-23px",
              }}
            >
              <img
                src="/favicon.ico"
                alt="Kinvia"
                style={{ width: 64, height: 64 }}
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
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: "0.7rem",
                  lineHeight: 1,
                  mt: 0.3,
                }}
              >
                Connections that last
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
          {!isMobile && villages.length > 0 && (
            <FormControl
              size="small"
              sx={{
                minWidth: 150,
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
                "& .MuiSvgIcon-root": {
                  color: "white",
                },
              }}
            >
              <Select
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">Select Village</MenuItem>
                {villages.map((village) => (
                  <MenuItem key={village.id} value={village.id}>
                    {village.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Auth Buttons */}
          {!isMobile && (
            <Box sx={{ ml: 2 }}>
              {currentUser ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AccountCircleIcon />
                  <Box sx={{ mr: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
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
              <Box sx={{ flexGrow: 1 }} />
              <IconButton
                color="inherit"
                edge="end"
                onClick={() => setDrawerOpen(!drawerOpen)}
              >
                <MenuIcon />
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
    </>
  );
};

export default Header;
