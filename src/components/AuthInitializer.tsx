import { useEffect } from "react";
import { useAppDispatch } from "../store/hooks";
import { initializeAuth, updateAuthState } from "../store/slices/authSlice";
import { supabase } from "../supabase";

/**
 * Component to handle auth initialization and state changes
 * No isMounted flags needed - Redux actions can safely complete after component unmounts
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    console.log("AuthInitializer: Setting up auth");

    // Initialize auth state
    dispatch(initializeAuth());

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthInitializer: Auth state changed, event:", event);
      const user = session?.user || null;
      dispatch(updateAuthState({ user }));
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
}
