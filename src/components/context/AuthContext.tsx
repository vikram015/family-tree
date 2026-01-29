import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { AppUser, UserRole } from "../model/User";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

interface AuthContextType {
  currentUser: any;
  userProfile: AppUser | null;
  loading: boolean;
  signInWithPhone: (phoneNumber: string) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
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
  let confirmationSession: Session | null = null;

  // Sign in with phone number - sends OTP
  async function signInWithPhone(phoneNumber: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
    });

    if (error) {
      throw new Error(error.message);
    }

    confirmationSession = data.session;
    console.log("OTP sent to", phoneNumber);
  }

  // Verify OTP and complete sign in
  async function verifyOtp(otp: string): Promise<void> {
    if (!confirmationSession?.user.phone) {
      throw new Error("No phone number in session");
    }

    const { data, error } = await supabase.auth.verifyOtp({
      phone: confirmationSession.user.phone,
      token: otp,
      type: "sms",
    });

    if (error) {
      throw new Error(error.message);
    }

    const user = data.user;

    if (!user) {
      throw new Error("No user returned from verification");
    }

    // Check if user profile exists, if not create one with default admin role
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("uid", user.id)
      .single();

    if (!existingUser) {
      // Create new user profile with admin role by default
      const newUserProfile: Omit<AppUser, "uid"> = {
        phoneNumber: user.phone || "",
        role: "admin",
        villages: [],
        displayName: user.phone || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("users")
        .insert([{ uid: user.id, ...newUserProfile }]);

      if (insertError) {
        throw new Error(insertError.message);
      }

      setUserProfile({ ...newUserProfile, uid: user.id });
    } else {
      setUserProfile({ uid: user.id, ...existingUser } as AppUser);
    }
  }

  async function logout() {
    setUserProfile(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
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
    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user;
      setCurrentUser(user || null);

      if (user) {
        // Fetch user profile from Supabase
        const { data: userProfile } = await supabase
          .from("users")
          .select("*")
          .eq("uid", user.id)
          .single();

        if (userProfile) {
          setUserProfile({ uid: user.id, ...userProfile } as AppUser);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
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
