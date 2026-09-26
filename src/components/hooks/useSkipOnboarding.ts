import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../store/hooks";
import {
  fetchUserOnboarding,
  updateUserOnboarding,
} from "../../store/slices/userOnboardingSlice";
import { consumePostLoginRedirect } from "../../utils/postLoginRedirect";

/**
 * Abandon onboarding and go where the user was originally headed.
 *
 * Lives in a hook because the control that triggers it moved into the header,
 * while the page that owns the rest of the flow still needs the same behaviour
 * — two copies of "mark skipped, refetch, redirect" would drift.
 */
export function useSkipOnboarding() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState("");

  const skip = useCallback(async () => {
    setSkipping(true);
    setError("");
    try {
      await dispatch(updateUserOnboarding({ status: "skipped" })).unwrap();
      await dispatch(fetchUserOnboarding()).unwrap();
      navigate(consumePostLoginRedirect() || "/", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Failed to skip onboarding.");
      setSkipping(false);
    }
  }, [dispatch, navigate]);

  return { skip, skipping, error };
}

export default useSkipOnboarding;
