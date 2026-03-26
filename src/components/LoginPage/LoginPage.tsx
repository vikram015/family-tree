import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LoginModal } from "../LoginModal/LoginModal";
import { useAuth } from "../hooks/useAuth";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile, loading } = useAuth();
  const from = (location.state as any)?.from?.pathname || "/families";
  const [open, setOpen] = useState(true);
  const [pendingPostLogin, setPendingPostLogin] = useState(false);

  useEffect(() => {
    if (!pendingPostLogin || loading) {
      return;
    }

    const isAdmin = userProfile?.role === "admin";
    const needsProfileCompletion =
      !userProfile?.name?.trim() ||
      !userProfile?.email?.trim() ||
      !userProfile?.privacyPolicyAccepted;
    const needsLink = isAdmin && !userProfile?.peopleId;
    const needsVillageRequest =
      isAdmin && (userProfile?.villages || []).length === 0;

    if (
      currentUser &&
      (needsProfileCompletion || needsLink || needsVillageRequest)
    ) {
      navigate("/", { replace: true });
    } else {
      navigate(from, { replace: true });
    }

    setPendingPostLogin(false);
  }, [
    pendingPostLogin,
    loading,
    currentUser,
    userProfile?.role,
    userProfile?.name,
    userProfile?.email,
    userProfile?.privacyPolicyAccepted,
    userProfile?.peopleId,
    userProfile?.villages,
    from,
    navigate,
    userProfile,
  ]);

  const handleClose = useCallback(() => {
    setOpen(false);
    navigate("/", { replace: true });
  }, [navigate]);

  const handleSuccess = useCallback(() => {
    setOpen(false);
    setPendingPostLogin(true);
  }, []);

  return (
    <LoginModal open={open} onClose={handleClose} onSuccess={handleSuccess} />
  );
};
