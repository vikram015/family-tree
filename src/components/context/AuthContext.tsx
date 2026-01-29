import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { AppUser, UserRole } from "../model/User";

interface AuthContextType {
  currentUser: any;
  userProfile: AppUser | null;
  loading: boolean;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
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

  console.log("AuthProvider: Initializing, loading:", loading);

  // Sign up with email and password
  async function signUpWithEmail(
    email: string,
    password: string,
  ): Promise<void> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    const user = data.user;
    if (!user) {
      throw new Error("No user returned from signup");
    }

    // Check if user profile exists, if not create one with default admin role
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!existingUser) {
      // Create new user profile with admin role by default
      const newUserProfile: Omit<AppUser, "id"> = {
        email: user.email || "",
        role: "admin",
        villages: [],
        displayName: user.email?.split("@")[0] || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("users")
        .insert([{ id: user.id, ...newUserProfile }]);

      if (insertError) {
        throw new Error(insertError.message);
      }

      setUserProfile({ ...newUserProfile, id: user.id });
    } else {
      setUserProfile({ id: user.id, ...existingUser } as AppUser);
    }
  }

  // Sign in with email and password
  async function signInWithEmail(
    email: string,
    password: string,
  ): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    const user = data.user;
    if (!user) {
      throw new Error("No user returned from login");
    }

    // Fetch user profile from Supabase
    const { data: userProfileData } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (userProfileData) {
      setUserProfile({ id: user.id, ...userProfileData } as AppUser);
    } else {
      // If no profile exists, create one
      const newUserProfile: Omit<AppUser, "id"> = {
        email: user.email || "",
        role: "admin",
        villages: [],
        displayName: user.email?.split("@")[0] || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("users")
        .insert([{ id: user.id, ...newUserProfile }]);

      if (!insertError) {
        setUserProfile({ ...newUserProfile, id: user.id });
      }
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
    // Check initial auth state
    const initAuth = async () => {
      try {
        console.log("AuthProvider: Checking initial auth state");
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log("AuthProvider: Initial session:", session?.user?.id);

        const user = session?.user;
        setCurrentUser(user || null);

        if (user) {
          // Fetch user profile from Supabase
          const { data: userProfile } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();

          if (userProfile) {
            console.log("AuthProvider: User profile loaded:", user.id);
            setUserProfile({ id: user.id, ...userProfile } as AppUser);
          } else {
            console.log("AuthProvider: No user profile found for:", user.id);
          }
        } else {
          console.log("AuthProvider: No session found");
        }
      } catch (error) {
        console.error("AuthProvider: Error initializing auth:", error);
      } finally {
        setLoading(false);
        console.log(
          "AuthProvider: Auth initialization complete, loading: false",
        );
      }
    };

    initAuth();

    // Subscribe to auth state changes
    console.log("AuthProvider: Setting up auth state listener");
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        "AuthProvider: Auth state changed, event:",
        event,
        "session user:",
        session?.user?.id,
      );
      const user = session?.user;
      setCurrentUser(user || null);

      if (user) {
        // Fetch user profile from Supabase
        const { data: userProfile } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (userProfile) {
          setUserProfile({ id: user.id, ...userProfile } as AppUser);
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
    signUpWithEmail,
    signInWithEmail,
    logout,
    hasPermission,
    isSuperAdmin,
    isAdmin,
    canManageVillage,
  };

  console.log(
    "AuthProvider: About to return context provider, loading:",
    loading,
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
