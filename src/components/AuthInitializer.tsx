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

    const ensureFreshSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.warn("AuthInitializer: getSession error:", error.message);
          dispatch(updateAuthState({ user: null }));
          return;
        }

        if (!session) {
          dispatch(updateAuthState({ user: null }));
          return;
        }

        const expiresAtMs = (session.expires_at || 0) * 1000;
        const msLeft = expiresAtMs - Date.now();

        // Refresh a bit early to avoid race with API calls after resume/focus.
        if (!expiresAtMs || msLeft < 2 * 60 * 1000) {
          const {
            data: refreshed,
            error: refreshError,
          } = await supabase.auth.refreshSession();

          if (refreshError) {
            console.warn(
              "AuthInitializer: refreshSession error:",
              refreshError.message,
            );
            dispatch(updateAuthState({ user: null }));
            return;
          }

          dispatch(
            updateAuthState({ user: refreshed.session?.user || session.user }),
          );
        }
      } catch (e) {
        console.warn("AuthInitializer: ensureFreshSession failed:", e);
      }
    };

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

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        ensureFreshSession();
      }
    };
    const onFocus = () => ensureFreshSession();

    // Periodic check to keep long-lived tabs healthy.
    const refreshTimer = window.setInterval(() => {
      ensureFreshSession();
    }, 60 * 1000);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      subscription?.unsubscribe();
      clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [dispatch]);

  return <>{children}</>;
}
