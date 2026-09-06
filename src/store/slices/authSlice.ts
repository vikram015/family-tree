import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "../../firebase";
import { backendApi } from "../../services/backendApi";
import { pushNotifications } from "../../services/pushNotifications";
import { AppUser, UserRole } from "../../components/model/User";
import { readSessionHint, writeSessionHint } from "../../utils/authSessionHint";

interface AuthState {
  currentUser: any;
  userProfile: AppUser | null;
  loading: boolean;
  error: string | null;
  /**
   * True once Firebase has reported whether a session exists. Until then
   * `currentUser === null` means "not known yet", not "signed out" — views that
   * branch on sign-in state must wait for this instead of assuming logged out.
   */
  initialized: boolean;
  /** Whether the last visit on this browser ended signed in. See authSessionHint. */
  hadSession: boolean;
}

const initialState: AuthState = {
  currentUser: null,
  userProfile: null,
  loading: true,
  error: null,
  initialized: false,
  hadSession: readSessionHint(),
};

type BackendUserProfile = {
  id: string;
  email?: string | null;
  role?: UserRole;
  locations?: string[] | null;
  peopleId?: string | null;
  name?: string | null;
  /** Linked person node's name when the profile is linked, else the users row. */
  displayName?: string | null;
  phone?: string | null;
  gender?: string | null;
  dob?: string | null;
  isVerified?: boolean | null;
  isBlocked?: boolean | null;
  blockedReason?: string | null;
  privacyPolicyAccepted?: boolean | null;
  createdAt?: string;
  modifiedAt?: string;
};

function mapBackendUserToAppUser(row: BackendUserProfile): AppUser {
  return {
    id: row.id,
    email: row.email || "",
    role: (row.role || "admin") as UserRole,
    locations: row.locations || [],
    peopleId: row.peopleId || undefined,
    // Backend resolves this from the linked person node when there is one;
    // `name` stays the users-table value the profile editor writes to.
    displayName: row.displayName || row.name || undefined,
    name: row.name || undefined,
    phone: row.phone || undefined,
    gender: row.gender || undefined,
    dob: row.dob || undefined,
    isVerified: row.isVerified ?? undefined,
    isBlocked: row.isBlocked ?? undefined,
    blockedReason: row.blockedReason ?? null,
    privacyPolicyAccepted: row.privacyPolicyAccepted ?? undefined,
    createdAt: row.createdAt || new Date().toISOString(),
    updatedAt: row.modifiedAt || new Date().toISOString(),
  };
}

export const updateAuthState = createAsyncThunk(
  "auth/updateState",
  async ({ user }: { user: any }, { rejectWithValue }) => {
    try {
      if (!user) {
        return { currentUser: null, userProfile: null };
      }

      const userProfile = await backendApi.get<BackendUserProfile>("/api/auth/me");

      return {
        currentUser: user,
        userProfile: userProfile ? mapBackendUserToAppUser(userProfile) : null,
      };
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to sync auth state");
    }
  },
);

export const logout = createAsyncThunk("auth/logout", async (_, { rejectWithValue }) => {
  try {
    // Drop this device's push token first — the request needs a valid auth
    // token, which signOut() below invalidates. Otherwise the next person to
    // sign in on this browser would keep receiving the previous user's pushes.
    try {
      await pushNotifications.unregister();
    } catch {
      // Best-effort: never block sign-out on push cleanup.
    }
    await signOut(firebaseAuth);
    writeSessionHint(false);
    return null;
  } catch (error: any) {
    return rejectWithValue(error?.message || "Failed to logout");
  }
});

export const linkUserToNode = createAsyncThunk(
  "auth/linkUserToNode",
  async ({ personId, treeId }: { personId: string; treeId: string }, { rejectWithValue }) => {
    try {
      await backendApi.post("/api/auth/link-node", { personId, treeId });
      return { personId };
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to link user to node");
    }
  },
);

export const updateUserProfile = createAsyncThunk(
  "auth/updateUserProfile",
  async (
    {
      name,
      phone,
      email,
      privacyPolicyAccepted,
      gender,
      dob,
    }: {
      name: string;
      phone: string;
      email?: string;
      privacyPolicyAccepted?: boolean;
      gender?: string;
      dob?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const row = await backendApi.patch<BackendUserProfile>("/api/auth/me", {
        name,
        phone,
        email,
        privacyPolicyAccepted,
        gender,
        dob,
      });
      return mapBackendUserToAppUser(row);
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to update profile");
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<any>) => {
      state.currentUser = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateAuthState.pending, (state, action) => {
        // Firebase has already answered by the time this fires, so publish the
        // user immediately — the profile fetch below is a separate, slower
        // round trip and the UI shouldn't look signed out while it runs.
        state.currentUser = action.meta.arg?.user ?? null;
        state.initialized = true;
        state.loading = true;
      })
      .addCase(updateAuthState.fulfilled, (state, action) => {
        state.initialized = true;
        state.currentUser = action.payload.currentUser;
        state.userProfile = action.payload.userProfile;
        state.loading = false;
        state.error = null;
      })
      .addCase(updateAuthState.rejected, (state, action) => {
        state.initialized = true;
        state.currentUser = null;
        state.userProfile = null;
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(logout.fulfilled, (state) => {
        state.currentUser = null;
        state.userProfile = null;
        state.error = null;
      })
      .addCase(linkUserToNode.fulfilled, (state, action) => {
        if (state.userProfile) {
          state.userProfile.peopleId = action.payload.personId;
        }
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.userProfile = action.payload;
      });
  },
});

export const { setCurrentUser, clearError } = authSlice.actions;

export const selectCurrentUser = (state: any) => state.auth.currentUser;
export const selectUserProfile = (state: any) => state.auth.userProfile;
export const selectAuthLoading = (state: any) => state.auth.loading;
export const selectAuthInitialized = (state: any) => state.auth.initialized;
export const selectHadSession = (state: any) => state.auth.hadSession;
export const selectAuthError = (state: any) => state.auth.error;

export const selectIsSuperAdmin = (state: any) =>
  state.auth.userProfile?.role === "superadmin";

export const selectIsAdmin = (state: any) =>
  state.auth.userProfile?.role === "admin" ||
  state.auth.userProfile?.role === "superadmin";

export const selectCanManageLocation = (locationId: string) => (state: any) => {
  const profile = state.auth.userProfile;
  if (!profile) return false;
  if (profile.role === "superadmin") return true;
  if (profile.role === "admin" && profile.locations.includes(locationId)) return true;
  return false;
};

export const selectHasPermission =
  (requiredRole?: UserRole, locationId?: string) => (state: any) => {
    const profile = state.auth.userProfile;
    if (!profile) return false;

    const roleHierarchy: Record<string, number> = {
      superadmin: 3,
      admin: 2,
      user: 1,
    };

    if (requiredRole && roleHierarchy[profile.role] < roleHierarchy[requiredRole]) {
      return false;
    }

    if (locationId && profile.role !== "superadmin") {
      return profile.locations.includes(locationId);
    }

    return true;
  };

export default authSlice.reducer;
