import React, { useCallback, useEffect, Suspense } from "react";
import {
  ThemeProvider,
  CssBaseline,
  Box,
  CircularProgress,
} from "@mui/material";
import { theme } from "../../theme/theme";
import {
  BrowserRouter,
  Routes,
  Route,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { AuthInitializer } from "../AuthInitializer";
import { LocationInitializer } from "../LocationInitializer";
import { PwaUpdatePrompt } from "../PwaUpdatePrompt/PwaUpdatePrompt";
import { PushNotificationToast } from "../PushNotificationToast/PushNotificationToast";
import Header from "../Header/Header";
import { HomePage } from "../HomePage/HomePage";
// import { FamiliesPage } from "../FamiliesPage/FamiliesPage"; // Lazy loaded
import { BusinessPage } from "../BusinessPage/BusinessPage";
import { FamousPage } from "../FamousPage/FamousPage";
// Route is disabled but the import is kept so restoring Contact is a one-line change.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ContactPage } from "../Contact/ContactPage";
import { AboutPage } from "../AboutPage/AboutPage";
import { FAQPage } from "../FAQ/FAQPage";
import { Footer } from "../Footer/Footer";
import { DebugPage } from "../DebugPage/DebugPage";
import { AdminManagement } from "../AdminManagement/AdminManagement";
import { ErrorBoundary } from "../ErrorBoundary/ErrorBoundary";
import { LoginPage } from "../LoginPage/LoginPage";
import { LoginModalProvider } from "../context/LoginModalContext";
import { NotificationPromptProvider } from "../context/NotificationPromptContext";
import {
  TreeFullscreenProvider,
  useTreeFullscreen,
} from "../context/TreeFullscreenContext";
import { ProfilePage } from "../ProfilePage/ProfilePage";
import { PrivacyPolicyPage } from "../PrivacyPolicyPage/PrivacyPolicyPage";
import { TermsPage } from "../TermsPage/TermsPage";
import { LocationsPage } from "../LocationsPage/LocationsPage";
import { PendingRequestsPage } from "../PendingRequestsPage";
import { UserOnboardingPage } from "../UserOnboardingPage";
import { UserOnboardingRouteGuard } from "../UserOnboardingRouteGuard";
import { RequireAuth } from "../RequireAuth/RequireAuth";
import { BlockedScreen } from "../BlockedScreen/BlockedScreen";
import { useAuth } from "../hooks/useAuth";
import { resolveDefaultFamilyTreePath } from "../../utils/defaultFamilyTreeNavigation";
import { ComingSoonPage } from "../ComingSoon/ComingSoonPage";
import { PhotosPage } from "../PhotosPage/PhotosPage";
import { shouldShowComingSoon } from "../../utils/comingSoon";

// Lazy load FamiliesPage
const FamiliesPage = React.lazy(() =>
  import("../FamiliesPage/FamiliesPage").then((module) => ({
    default: module.FamiliesPage,
  })),
);

function AppContent() {
  const { isFullscreen: isTreeFullscreen } = useTreeFullscreen();
  console.log("AppContent: Rendering");
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userProfile, loading } = useAuth();
  const treeId = searchParams.get("tree") || "";

  // The footer is shown on standard content pages. It's hidden on full-screen
  // / self-managed-height routes: the tree view (/families), the photos page
  // (/photos — also has its own fixed FAB, same reason), onboarding, and the
  // login screen, where a scrolling footer would get in the way.
  const footerHiddenRoutes = ["/families", "/photos", "/onboarding", "/login"];
  const showFooter = !footerHiddenRoutes.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
  );

  const setTreeId = useCallback(
    (value: string, options?: { personId?: string | null }) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        const currentTreeId = prev.get("tree") || "";
        const isSameTree = value === currentTreeId;

        if (value) {
          next.set("tree", value);
        } else {
          next.delete("tree");
          next.delete("personId");
          return next;
        }

        if (options) {
          if (options.personId) {
            next.set("personId", options.personId);
          } else {
            next.delete("personId");
          }
        } else if (!isSameTree) {
          next.delete("personId");
        }

        return next;
      });
    },
    [setSearchParams],
  );

  useEffect(() => {
    // Prefetch FamiliesPage code in background after initial load
    const timer = setTimeout(() => {
      import("../FamiliesPage/FamiliesPage");
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (location.pathname !== "/families" || treeId || !currentUser) {
      return;
    }

    let active = true;
    resolveDefaultFamilyTreePath().then((targetPath) => {
      if (active && targetPath !== "/families") {
        navigate(targetPath, { replace: true });
      }
    });

    return () => {
      active = false;
    };
  }, [currentUser, location.pathname, navigate, treeId]);

  const onChange = useCallback(
    (value: string) => {
      setTreeId(value);
    },
    [setTreeId],
  );

  // A blocked user stays authenticated (so we can read the flag from /api/auth/me)
  // but must not see the app — replace everything with a blocked message.
  if (!loading && currentUser && userProfile?.isBlocked) {
    return (
      <>
        <Header locked />
        <BlockedScreen reason={userProfile.blockedReason} />
      </>
    );
  }

  console.log("AppContent: About to return JSX");
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        // dynamic viewport height for mobile browsers
        minHeight: "-webkit-fill-available",
        "@media (min-height: 0)": {
          height: "100dvh",
        },
      }}
    >
      <UserOnboardingRouteGuard />
      <PushNotificationToast />
      {!isTreeFullscreen && <Header />}
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", width: "100%" }}>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            // Contain page scrolling here so the shell stays viewport-height and
            // the header above never scrolls off — i.e. a sticky navbar. Pages
            // that manage their own height (e.g. FamiliesPage) fit exactly and
            // don't gain a second scrollbar.
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <Box
            sx={
              showFooter
                ? {
                    // Content pages: column layout so the footer can sit at the
                    // bottom (grows past the viewport when content is tall).
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "100%",
                  }
                : {
                    // Full-height pages (e.g. FamiliesPage) manage their own
                    // height — give a definite 100% so height:100% resolves and
                    // the page isn't shrunk to content height.
                    height: "100%",
                  }
            }
          >
            <ErrorBoundary>
              <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/onboarding" element={<UserOnboardingPage />} />
              <Route
                path="/families"
                element={
                  <Suspense
                    fallback={
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          height: "100vh",
                        }}
                      >
                        <CircularProgress />
                      </Box>
                    }
                  >
                    <FamiliesPage
                      treeId={treeId}
                      setTreeId={setTreeId}
                      onSourceChange={onChange}
                      onCreate={(id) => {
                        onChange(id);
                      }}
                    />
                  </Suspense>
                }
              />
              <Route
                path="/business"
                element={
                  <RequireAuth>
                    <BusinessPage />
                  </RequireAuth>
                }
              />
              <Route path="/famous" element={<FamousPage />} />
              <Route
                path="/photos"
                element={
                  <RequireAuth>
                    <PhotosPage />
                  </RequireAuth>
                }
              />
              {/* Contact page hidden for now — route disabled so it's unreachable.
                  ContactPage import kept so restoring is a one-line uncomment. */}
              {/* <Route path="/contact" element={<ContactPage />} /> */}
              <Route path="/about" element={<AboutPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/admin" element={<AdminManagement />} />
              <Route path="/debug" element={<DebugPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/person/:personId" element={<ProfilePage />} />
              <Route path="/requests" element={<PendingRequestsPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/locations" element={<LocationsPage />} />
            </Routes>
            </ErrorBoundary>
            {showFooter && <Footer />}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default React.memo(function App() {
  console.log("App component: Starting to render");

  // Pre-launch gate: render ONLY the launching-soon page — no router, no auth,
  // no data fetching. Flip VITE_COMING_SOON to false at launch.
  if (shouldShowComingSoon()) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ComingSoonPage />
      </ThemeProvider>
    );
  }

  try {
    return (
      <HelmetProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <AuthInitializer>
              <LocationInitializer>
                <LoginModalProvider>
                  <NotificationPromptProvider>
                    <TreeFullscreenProvider>
                      <BrowserRouter>
                        <AppContent />
                      </BrowserRouter>
                      <PwaUpdatePrompt />
                    </TreeFullscreenProvider>
                  </NotificationPromptProvider>
                </LoginModalProvider>
              </LocationInitializer>
            </AuthInitializer>
          </LocalizationProvider>
        </ThemeProvider>
      </HelmetProvider>
    );
  } catch (error) {
    console.error("App component error:", error);
    throw error;
  }
});
