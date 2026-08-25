import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchUserOnboarding,
  selectEffectiveUserOnboardingData,
  selectUserOnboardingLoaded,
  selectUserOnboardingLoading,
} from "../store/slices/userOnboardingSlice";

export const UserOnboardingRouteGuard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile, loading } = useAuth();
  const onboarding = useAppSelector(selectEffectiveUserOnboardingData);
  const onboardingLoaded = useAppSelector(selectUserOnboardingLoaded);
  const onboardingLoading = useAppSelector(selectUserOnboardingLoading);

  useEffect(() => {
    if (!currentUser || loading || userProfile?.role !== "admin") {
      return;
    }

    if (!onboardingLoaded && !onboardingLoading) {
      dispatch(fetchUserOnboarding());
    }
  }, [
    currentUser,
    loading,
    userProfile?.role,
    onboardingLoaded,
    onboardingLoading,
    dispatch,
  ]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!currentUser) {
      if (location.pathname === "/onboarding") {
        navigate("/login", {
          replace: true,
          state: { from: { pathname: "/onboarding" } },
        });
      }
      return;
    }

    if (userProfile?.role !== "admin") {
      if (location.pathname === "/onboarding") {
        navigate("/families", { replace: true });
      }
      return;
    }

    if (!onboardingLoaded || onboardingLoading) {
      return;
    }

    // An invite link carries a one-time token that only FamiliesPage can
    // redeem, and redirecting would strip it from the URL for good. Let the
    // acceptance run — it completes onboarding on the backend, so the user
    // lands in the tree they were invited to instead of the onboarding flow.
    if (new URLSearchParams(location.search).get("inviteToken")) {
      return;
    }

    // Only actively-in-progress users are forced into onboarding. A user who
    // has completed OR explicitly skipped it may roam the app freely.
    const needsOnboarding = onboarding.status === "in_progress";

    if (needsOnboarding && location.pathname !== "/onboarding") {
      navigate("/onboarding", { replace: true });
      return;
    }

    // NOTE: the post-completion redirect (honoring the remembered origin, else
    // the tree) is owned by UserOnboardingPage's completion handlers, so this
    // guard deliberately does NOT navigate on completion. That keeps
    // UserOnboardingPage the single consumer of the post-login redirect token
    // and avoids a race where two navigators would both consume it.
  }, [
    currentUser,
    loading,
    location.pathname,
    location.search,
    navigate,
    onboarding.status,
    onboardingLoaded,
    onboardingLoading,
    userProfile?.role,
  ]);

  return null;
};
