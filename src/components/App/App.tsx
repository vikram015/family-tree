import React, { useState, useCallback } from "react";
import { ThemeProvider, createTheme, CssBaseline, Box } from "@mui/material";
import {
  BrowserRouter,
  Routes,
  Route,
  useSearchParams,
} from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "../context/AuthContext";
import { VillageProvider } from "../context/VillageContext";
import Header from "../Header/Header";
import { HomePage } from "../HomePage/HomePage";
import { FamiliesPage } from "../FamiliesPage/FamiliesPage";
import { HeritagePage } from "../HeritagePage/HeritagePage";
import { BusinessPage } from "../BusinessPage/BusinessPage";
import { FamousPage } from "../FamousPage/FamousPage";
import { ContactPage } from "../Contact/ContactPage";
import { DebugPage } from "../DebugPage/DebugPage";
import { AdminManagement } from "../AdminManagement/AdminManagement";
import { ErrorBoundary } from "../ErrorBoundary/ErrorBoundary";
import { LoginPage } from "../LoginPage/LoginPage";
import { LoginModalProvider } from "../context/LoginModalContext";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [treeId, setTreeId] = useState<string>(() => {
    return searchParams.get("tree") || "";
  });

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
    [setSearchParams]
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/families"
            element={
              <FamiliesPage
                treeId={treeId}
                setTreeId={setTreeId}
                onSourceChange={onChange}
                onCreate={(id) => setTreeId(id)}
              />
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
  return (
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <VillageProvider>
            <LoginModalProvider>
              <BrowserRouter>
                <AppContent />
              </BrowserRouter>
            </LoginModalProvider>
          </VillageProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
});
