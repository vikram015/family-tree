import { useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { useAppDispatch } from "../store/hooks";
import { updateAuthState } from "../store/slices/authSlice";
import { firebaseAuth } from "../firebase";

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(firebaseAuth, async (user) => {
      if (!user) {
        dispatch(updateAuthState({ user: null }));
        return;
      }

      dispatch(
        updateAuthState({
          user: {
            uid: user.uid,
            phoneNumber: user.phoneNumber,
            email: user.email,
            displayName: user.displayName,
          },
        }),
      );
    });

    return () => unsubscribe();
  }, [dispatch]);

  return <>{children}</>;
}
