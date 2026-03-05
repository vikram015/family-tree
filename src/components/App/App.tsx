import React, { useCallback, useEffect, Suspense } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  CircularProgress,
} from "@mui/material";
import {
  BrowserRouter,
  Routes,
  Route,
  useSearchParams,
} from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { AuthInitializer } from "../AuthInitializer";
import { VillageInitializer } from "../VillageInitializer";
import Header from "../Header/Header";
import { HomePage } from "../HomePage/HomePage";
// import { FamiliesPage } from "../FamiliesPage/FamiliesPage"; // Lazy loaded
import { BusinessPage } from "../BusinessPage/BusinessPage";
import { FamousPage } from "../FamousPage/FamousPage";
import { ContactPage } from "../Contact/ContactPage";
import { DebugPage } from "../DebugPage/DebugPage";
import { AdminManagement } from "../AdminManagement/AdminManagement";
import { ErrorBoundary } from "../ErrorBoundary/ErrorBoundary";
import { LoginPage } from "../LoginPage/LoginPage";
import { LoginModalProvider } from "../context/LoginModalContext";
import { LinkNodeDialog } from "../LinkNodeDialog/LinkNodeDialog";
import { ProfilePage } from "../ProfilePage/ProfilePage";
import { PrivacyPolicyPage } from "../PrivacyPolicyPage/PrivacyPolicyPage";

// Lazy load FamiliesPage
const FamiliesPage = React.lazy(() =>
  import("../FamiliesPage/FamiliesPage").then((module) => ({
    default: module.FamiliesPage,
  })),
);

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
});

function AppContent() {
  console.log("AppContent: Rendering");
  const [searchParams, setSearchParams] = useSearchParams();
  const treeId = searchParams.get("tree") || "";

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

  const onChange = useCallback(
    (value: string) => {
      setTreeId(value);
    },
    [setTreeId],
  );

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
      <LinkNodeDialog />
      <Header />
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", width: "100%" }}>
        <Box sx={{ flex: 1, minHeight: 0, width: "100%" }}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
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
              <Route path="/business" element={<BusinessPage />} />
              <Route path="/famous" element={<FamousPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/admin" element={<AdminManagement />} />
              <Route path="/debug" element={<DebugPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            </Routes>
          </ErrorBoundary>
        </Box>
      </Box>
    </Box>
  );
}

export default React.memo(function App() {
  console.log("App component: Starting to render");
  try {
    return (
      <HelmetProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <AuthInitializer>
              <VillageInitializer>
                <LoginModalProvider>
                  <BrowserRouter>
                    <AppContent />
                  </BrowserRouter>
                </LoginModalProvider>
              </VillageInitializer>
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
