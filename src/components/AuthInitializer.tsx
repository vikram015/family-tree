import { useEffect } from "react";
import { useAppDispatch } from "../store/hooks";
import {
  updateAuthState,
  setResetPasswordMode,
} from "../store/slices/authSlice";
import { supabase } from "../supabase";

/**
 * Component to handle auth initialization and state changes
 * No isMounted flags needed - Redux actions can safely complete after component unmounts
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    console.log("AuthInitializer: Setting up auth");

    // Subscribe to auth state changes
    // This fires immediately with the current session (INITIAL_SESSION),
    // and whenever the token is refreshed (TOKEN_REFRESHED) or user signs in/out.
    // We rely on this single source of truth instead of manually calling initializeAuth()
    // to avoid race conditions and double-fetching.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthInitializer: Auth state changed, event:", event);

      if (event === "PASSWORD_RECOVERY") {
        dispatch(setResetPasswordMode(true));
      }

      if (event === "SIGNED_OUT") {
        dispatch(updateAuthState({ user: null }));
        return;
      }

      // For INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, PASSWORD_RECOVERY, USER_UPDATED
      const user = session?.user || null;
      dispatch(updateAuthState({ user }));
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
}
