import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LoginModal } from "../LoginModal/LoginModal";
import { useAuth } from "../hooks/useAuth";
import { resolveDefaultFamilyTreePath } from "../../utils/defaultFamilyTreeNavigation";
import { useAppSelector } from "../../store/hooks";
import {
  selectEffectiveUserOnboardingData,
  selectUserOnboardingLoaded,
} from "../../store/slices/userOnboardingSlice";
import {
  consumePostLoginRedirect,
  setPostLoginRedirectIfAbsent,
} from "../../utils/postLoginRedirect";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile, loading } = useAuth();
  const onboarding = useAppSelector(selectEffectiveUserOnboardingData);
  const onboardingLoaded = useAppSelector(selectUserOnboardingLoaded);
  const from = (location.state as any)?.from?.pathname || "/families";
  const [open, setOpen] = useState(true);

  // Persist where the login was initiated so it survives the onboarding detour
  // (router state on this navigation is lost once the onboarding guard runs).
  useEffect(() => {
    setPostLoginRedirectIfAbsent((location.state as any)?.from?.pathname);
  }, [location.state]);

  useEffect(() => {
    if (loading || !currentUser) {
      return;
    }

    // Admins may be sent through onboarding first. Wait for its status to load.
    const isAdmin = userProfile?.role === "admin";
    if (isAdmin && !onboardingLoaded) {
      return;
    }
    const needsOnboarding = isAdmin && onboarding.status === "in_progress";
    if (needsOnboarding) {
      // Navigate to onboarding ourselves instead of waiting for the global
      // onboarding guard to react. The cross-component handoff races with the
      // repeated auth-state updates fired during sign-in and could leave a
      // freshly logged-in user stranded on /login until a manual refresh.
      // This does NOT consume the remembered post-login redirect — the guard
      // still consumes it once onboarding completes — so the original
      // destination is preserved.
      navigate("/onboarding", { replace: true });
      return;
    }

    let active = true;
    const target = consumePostLoginRedirect() || from;

    if (target === "/families") {
      resolveDefaultFamilyTreePath().then((targetPath) => {
        if (active) {
          navigate(targetPath, { replace: true });
        }
      });
    } else {
      if (active) {
        navigate(target, { replace: true });
      }
    }

    return () => {
      active = false;
    };
  }, [
    loading,
    currentUser,
    userProfile?.role,
    onboarding.status,
    onboardingLoaded,
    from,
    navigate,
  ]);

  const handleClose = useCallback(() => {
    // Abandoning login discards the remembered destination.
    consumePostLoginRedirect();
    setOpen(false);
    navigate("/", { replace: true });
  }, [navigate]);

  const handleSuccess = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <LoginModal open={open} onClose={handleClose} onSuccess={handleSuccess} />
  );
};
