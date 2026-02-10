import React, { useState, useCallback, useEffect, Suspense } from "react";
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
import { AuthInitializer } from "../AuthInitializer";
import { VillageInitializer } from "../VillageInitializer";
import Header from "../Header/Header";
import { HomePage } from "../HomePage/HomePage";
// import { FamiliesPage } from "../FamiliesPage/FamiliesPage"; // Lazy loaded
import { HeritagePage } from "../HeritagePage/HeritagePage";
import { BusinessPage } from "../BusinessPage/BusinessPage";
import { FamousPage } from "../FamousPage/FamousPage";
import { ContactPage } from "../Contact/ContactPage";
import { DebugPage } from "../DebugPage/DebugPage";
import { AdminManagement } from "../AdminManagement/AdminManagement";
import { ErrorBoundary } from "../ErrorBoundary/ErrorBoundary";
import { LoginPage } from "../LoginPage/LoginPage";
import { LoginModalProvider } from "../context/LoginModalContext";
import { ResetPasswordModal } from "../ResetPasswordModal/ResetPasswordModal";

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
  const [treeId, setTreeId] = useState<string>(() => {
    return searchParams.get("tree") || "";
  });

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
      // Update URL with tree ID
      if (value) {
        setSearchParams({ tree: value });
      } else {
        setSearchParams({});
      }
    },
    [setSearchParams],
  );

  console.log("AppContent: About to return JSX");
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <ResetPasswordModal />
      <Header />
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
                    setTreeId(id);
                    onChange(id);
                  }}
                />
              </Suspense>
            }
          />
          <Route path="/heritage" element={<HeritagePage />} />
          <Route path="/business" element={<BusinessPage />} />
          <Route path="/famous" element={<FamousPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/admin" element={<AdminManagement />} />
          <Route path="/debug" element={<DebugPage />} />
        </Routes>
      </ErrorBoundary>
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
          <AuthInitializer>
            <VillageInitializer>
              <LoginModalProvider>
                <BrowserRouter>
                  <AppContent />
                </BrowserRouter>
              </LoginModalProvider>
            </VillageInitializer>
          </AuthInitializer>
        </ThemeProvider>
      </HelmetProvider>
    );
  } catch (error) {
    console.error("App component error:", error);
    throw error;
  }
});
