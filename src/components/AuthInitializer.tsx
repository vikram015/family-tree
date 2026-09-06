import { useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { useAppDispatch } from "../store/hooks";
import { updateAuthState } from "../store/slices/authSlice";
import { firebaseAuth } from "../firebase";
import { writeSessionHint } from "../utils/authSessionHint";

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(firebaseAuth, async (user) => {
      // Remember the answer so the next cold load can paint the right view
      // before Firebase has restored the session from IndexedDB.
      writeSessionHint(!!user);

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
