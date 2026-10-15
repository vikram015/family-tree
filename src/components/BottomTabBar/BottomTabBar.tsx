import React, { useLayoutEffect } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import HomeIcon from "@mui/icons-material/Home";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import StorefrontIcon from "@mui/icons-material/Storefront";
import Diversity3OutlinedIcon from "@mui/icons-material/Diversity3Outlined";
import Diversity3Icon from "@mui/icons-material/Diversity3";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import { brand } from "../../theme/brand";

/**
 * The phone's main navigation: the four sections people move between most,
 * always visible and in thumb reach. Everything else (Explore, About, profile,
 * requests, admin) stays in the ☰ drawer.
 *
 * It is a flex item at the bottom of the app column, not an overlay, so pages
 * shrink to fit above it rather than sliding underneath. Anything that is
 * itself `position: fixed` to the bottom (a FAB, a snackbar) lifts by
 * `--kinvia-bottom-nav`, which this sets while it is mounted.
 */

export const BOTTOM_TAB_HEIGHT = 64;

const TABS = [
  { label: "Home", path: "/", icon: HomeOutlinedIcon, activeIcon: HomeIcon },
  { label: "Business", path: "/business", icon: StorefrontOutlinedIcon, activeIcon: StorefrontIcon },
  { label: "Families", path: "/families", icon: Diversity3OutlinedIcon, activeIcon: Diversity3Icon },
  { label: "Photos", path: "/photos", icon: PhotoLibraryOutlinedIcon, activeIcon: PhotoLibraryIcon },
] as const;

function isActive(tabPath: string, pathname: string): boolean {
  if (tabPath === "/") return pathname === "/";
  return pathname === tabPath || pathname.startsWith(`${tabPath}/`);
}

export const BottomTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      "--kinvia-bottom-nav",
      `calc(${BOTTOM_TAB_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
    );
    return () => {
      root.style.removeProperty("--kinvia-bottom-nav");
    };
  }, []);

  return (
    <Box
      component="nav"
      aria-label="Main"
      sx={{
        flexShrink: 0,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        height: `calc(${BOTTOM_TAB_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
        pb: "env(safe-area-inset-bottom, 0px)",
        px: 0.5,
        bgcolor: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(16px)",
        borderTop: `1px solid ${brand.border}`,
        boxShadow: "0 -2px 12px rgba(15,23,42,0.05)",
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.path, location.pathname);
        const Icon = active ? tab.activeIcon : tab.icon;
        return (
          <ButtonBase
            key={tab.path}
            aria-current={active ? "page" : undefined}
            onClick={() => {
              // Families always opens the tree list, even when a tree's query
              // string is still in the URL from before.
              if (active && location.pathname === tab.path && !location.search) return;
              navigate(tab.path);
            }}
            sx={{
              flex: 1,
              minWidth: 64,
              height: "100%",
              maxHeight: BOTTOM_TAB_HEIGHT,
              flexDirection: "column",
              gap: 0.25,
              borderRadius: 3,
              color: active ? brand.primary : brand.slateMuted,
              transition: "color 120ms ease",
            }}
          >
            <Icon sx={{ fontSize: 24 }} />
            <Typography sx={{ fontSize: 11.5, fontWeight: active ? 800 : 600, lineHeight: 1.2 }}>
              {tab.label}
            </Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
};

export default BottomTabBar;
