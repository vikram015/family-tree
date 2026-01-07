import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import {
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { AppUser, UserRole } from "../model/User";

interface AuthContextType {
  currentUser: any;
  userProfile: AppUser | null;
  loading: boolean;
  setupRecaptcha: (containerId: string) => RecaptchaVerifier;
  signInWithPhone: (
    phoneNumber: string,
    recaptchaVerifier: RecaptchaVerifier
  ) => Promise<ConfirmationResult>;
  verifyOtp: (
    confirmationResult: ConfirmationResult,
    otp: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (requiredRole?: UserRole, villageId?: string) => boolean;
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
  canManageVillage: (villageId: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup reCAPTCHA for phone authentication (singleton per page)
  function setupRecaptcha(containerId: string): RecaptchaVerifier {
    // Reuse existing verifier if present
    const existing = (window as any).recaptchaVerifier as
      | RecaptchaVerifier
      | undefined;
    if (existing) return existing;

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`reCAPTCHA container '${containerId}' not found`);
    }

    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {
        console.log("reCAPTCHA solved");
      },
    });

    (window as any).recaptchaVerifier = verifier;
    return verifier;
  }

  // Sign in with phone number
  async function signInWithPhone(
    phoneNumber: string,
    recaptchaVerifier: RecaptchaVerifier
  ): Promise<ConfirmationResult> {
    return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
  }

  // Verify OTP and complete sign in
  async function verifyOtp(
    confirmationResult: ConfirmationResult,
    otp: string
  ): Promise<void> {
    const result = await confirmationResult.confirm(otp);
    const user = result.user;

    // Check if user profile exists, if not create one with default admin role
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create new user profile with admin role by default
      // SuperAdmin needs to be set manually in Firestore or by another SuperAdmin
      const newUserProfile: Omit<AppUser, "uid"> = {
        phoneNumber: user.phoneNumber || "",
        role: "admin",
        villages: [], // Empty by default, SuperAdmin will assign villages
        displayName: user.phoneNumber || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(userRef, newUserProfile);
      setUserProfile({ ...newUserProfile, uid: user.uid });
    } else {
      setUserProfile({ uid: user.uid, ...userSnap.data() } as AppUser);
    }
  }

  async function logout() {
    setUserProfile(null);
    return signOut(auth);
  }

  // Permission checks
  function isSuperAdmin(): boolean {
    return userProfile?.role === "superadmin";
  }

  function isAdmin(): boolean {
    return userProfile?.role === "admin" || userProfile?.role === "superadmin";
  }

  function canManageVillage(villageId: string): boolean {
    if (!userProfile) return false;
    if (userProfile.role === "superadmin") return true;
    return userProfile.villages.includes(villageId);
  }

  function hasPermission(requiredRole?: UserRole, villageId?: string): boolean {
    if (!userProfile) return false;

    // SuperAdmin has all permissions
    if (userProfile.role === "superadmin") return true;

    // Check role requirement
    if (requiredRole && userProfile.role !== requiredRole) {
      return false;
    }

    // Check village access for admins
    if (villageId && userProfile.role === "admin") {
      return userProfile.villages.includes(villageId);
    }

    return true;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Fetch user profile from Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUserProfile({ uid: user.uid, ...userSnap.data() } as AppUser);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    setupRecaptcha,
    signInWithPhone,
    verifyOtp,
    logout,
    hasPermission,
    isSuperAdmin,
    isAdmin,
    canManageVillage,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
