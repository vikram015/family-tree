import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { setPostLoginRedirect } from "../../utils/postLoginRedirect";

/**
 * Gates a route to authenticated users only. A logged-out visitor is sent to
 * the login screen, and the page they tried to reach is remembered so they can
 * be returned there after login (and after onboarding, if required).
 */
export const RequireAuth: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    const target = `${location.pathname}${location.search}`;
    setPostLoginRedirect(target);
    return (
      <Navigate to="/login" replace state={{ from: location }} />
    );
  }

  return children;
};

export default RequireAuth;
