import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../supabase';
import { AppUser, UserRole } from '../../components/model/User';

interface AuthState {
  currentUser: any;
  userProfile: AppUser | null;
  loading: boolean;
  error: string | null;
  resetPasswordMode: boolean;
}

const initialState: AuthState = {
  currentUser: null,
  userProfile: null,
  loading: true,
  error: null,
  resetPasswordMode: false,
};

function isAuthTokenError(message?: string): boolean {
  if (!message) return false;
  const msg = message.toLowerCase();
  return (
    msg.includes('jwt') ||
    msg.includes('token') ||
    msg.includes('session') ||
    msg.includes('auth session missing')
  );
}

// Async thunks
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        return { currentUser: null, userProfile: null };
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      }

      return {
        currentUser: user,
        userProfile: userProfile ? { id: user.id, ...userProfile } as AppUser : null,
      };
    } catch (error: any) {
      if (isAuthTokenError(error?.message)) {
        return { currentUser: null, userProfile: null };
      }
      return rejectWithValue(error.message);
    }
  }
);

export const signUpWithEmail = createAsyncThunk(
  'auth/signUp',
  async ({ email, password, name, phone }: { email: string; password: string; name: string; phone: string }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone
          }
        }
      });

      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('No user returned from signup');

      // If session is missing, it means email verification is required (or manual approval).
      // The user is NOT logged in yet.
      if (!data.session) {
        return {
          currentUser: null,
          userProfile: null,
        };
      }

      const user = data.user;
      
      // We do NOT create the user profile here anymore.
      // It will be created when they login for the first time.
      // The name and phone are stored in user_metadata which will be accessible then.

      return {
        currentUser: user,
        userProfile: null, // Profile not created yet
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const signInWithEmail = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('No user returned from login');

      const user = data.user;

      const { data: userProfileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      }

      if (userProfileData) {
        // Map snake_case DB fields to camelCase app fields
        const existingUserProfile: AppUser = {
          id: userProfileData.id,
          email: userProfileData.email,
          role: userProfileData.role,
          villages: userProfileData.villages || [],
          peopleId: userProfileData.people_id || undefined,
          displayName: userProfileData.name,
          name: userProfileData.name,
          phone: userProfileData.phone,
          isVerified: userProfileData.is_verified,
          createdAt: userProfileData.created_at,
          updatedAt: userProfileData.modified_at,
        };

        return {
          currentUser: user,
          userProfile: existingUserProfile,
        };
      }

      // Create profile if doesn't exist
      const metadata = user.user_metadata || {};
      
      const dbUser = {
        id: user.id,
        email: user.email || '',
        role: 'admin',
        villages: [],
        name: metadata.name || user.email?.split('@')[0] || '',
        phone: metadata.phone || '',
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('users')
        .insert([dbUser]);

      if (insertError) throw new Error(insertError.message);

      const newUserProfile: AppUser = {
        id: user.id,
        email: dbUser.email,
        role: dbUser.role as UserRole,
        villages: [],
        displayName: dbUser.name,
        name: dbUser.name,
        phone: dbUser.phone,
        createdAt: dbUser.created_at,
        updatedAt: dbUser.modified_at,
      };

      return {
        currentUser: user,
        userProfile: newUserProfile,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message);
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const sendPasswordResetEmail = createAsyncThunk(
  'auth/sendPasswordResetEmail',
  async (email: string, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw new Error(error.message);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updatePassword = createAsyncThunk(
  'auth/updatePassword',
  async (password: string, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateAuthState = createAsyncThunk(
  'auth/updateState',
  async ({ user }: { user: any }, { rejectWithValue, getState }) => {
    try {
      if (!user) {
        return { currentUser: null, userProfile: null };
      }

      // Check current state to see if we already have this user's profile
      const state = getState() as any;
      const currentProfile = state.auth?.userProfile;

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        if (isAuthTokenError(profileError.message)) {
          return { currentUser: null, userProfile: null };
        }
        // Fallback to existing profile if IDs match to prevent "logout" on transient errors
        if (currentProfile && currentProfile.id === user.id) {
          return { currentUser: user, userProfile: currentProfile };
        }
      }

      if (userProfile) {
        // Map snake_case DB fields to camelCase app fields
        const existingUserProfile: AppUser = {
          id: userProfile.id,
          email: userProfile.email,
          role: userProfile.role,
          villages: userProfile.villages || [],
          peopleId: userProfile.people_id || undefined,
          displayName: userProfile.name,
          name: userProfile.name,
          phone: userProfile.phone,
          isVerified: userProfile.is_verified,
          createdAt: userProfile.created_at,
          updatedAt: userProfile.modified_at,
        };
        return {
          currentUser: user,
          userProfile: existingUserProfile
        };
      }

      // If no profile exists (first login via email link or otherwise), create it now
      
      // Refetch user to ensure we have the latest metadata (sometimes session user is stale)
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      const metadata = freshUser?.user_metadata || user.user_metadata || {};
      
      console.log('Creating user profile with metadata:', metadata);
      
      const dbUser = {
        id: user.id,
        email: user.email || '',
        role: 'admin',
        villages: [],
        name: metadata.name || user.email?.split('@')[0] || '',
        phone: metadata.phone || '',
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('users')
        .insert([dbUser]);

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        throw new Error(insertError.message);
      }

      const newUserProfile: AppUser = {
        id: user.id,
        email: dbUser.email,
        role: dbUser.role as UserRole,
        villages: [],
        displayName: dbUser.name,
        name: dbUser.name,
        phone: dbUser.phone,
        createdAt: dbUser.created_at,
        updatedAt: dbUser.modified_at,
      };

      return {
        currentUser: user,
        userProfile: newUserProfile,
      };
    } catch (error: any) {
      if (isAuthTokenError(error?.message)) {
        return { currentUser: null, userProfile: null };
      }
      return rejectWithValue(error.message);
    }
  },
);

// Link current user to a person node (self-link on first login)
export const linkUserToNode = createAsyncThunk(
  'auth/linkUserToNode',
  async ({ personId, treeId }: { personId: string; treeId: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const userId = state.auth.currentUser?.id;
      if (!userId) throw new Error('Not authenticated');

      // Look up the tree to find its village_id
      const { data: tree, error: treeError } = await supabase
        .from('tree')
        .select('village_id')
        .eq('id', treeId)
        .single();

      if (treeError) throw new Error(treeError.message);

      const currentVillages = state.auth.userProfile?.villages || [];
      const villageId = tree?.village_id;
      const updatedVillages = villageId && !currentVillages.includes(villageId)
        ? [...currentVillages, villageId]
        : currentVillages;

      // Update user record: set people_id and add tree's village to villages array
      const { error: updateError } = await supabase
        .from('users')
        .update({
          people_id: personId,
          villages: updatedVillages,
          modified_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw new Error(updateError.message);

      return { personId, villages: updatedVillages };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Update user profile details
export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async ({ name, phone }: { name: string; phone: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const userId = state.auth.currentUser?.id;
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .update({
          name,
          phone,
          modified_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw new Error(error.message);

      return { name, phone };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<any>) => {
      state.currentUser = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setResetPasswordMode: (state, action: PayloadAction<boolean>) => {
      state.resetPasswordMode = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize auth
      .addCase(initializeAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.currentUser = action.payload.currentUser;
        state.userProfile = action.payload.userProfile;
        state.loading = false;
        state.error = null;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Sign up
      .addCase(signUpWithEmail.pending, (state) => {
        state.loading = true;
      })
      .addCase(signUpWithEmail.fulfilled, (state, action) => {
        state.currentUser = action.payload.currentUser;
        state.userProfile = action.payload.userProfile;
        state.loading = false;
        state.error = null;
      })
      .addCase(signUpWithEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Sign in
      .addCase(signInWithEmail.pending, (state) => {
        state.loading = true;
      })
      .addCase(signInWithEmail.fulfilled, (state, action) => {
        state.currentUser = action.payload.currentUser;
        state.userProfile = action.payload.userProfile;
        state.loading = false;
        state.error = null;
      })
      .addCase(signInWithEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.currentUser = null;
        state.userProfile = null;
        state.error = null;
      })
      // Update auth state
      .addCase(updateAuthState.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateAuthState.fulfilled, (state, action) => {
        state.currentUser = action.payload.currentUser;
        state.userProfile = action.payload.userProfile;
        state.loading = false;
        state.error = null;
      })
      .addCase(updateAuthState.rejected, (state, action) => {
        state.currentUser = null;
        state.userProfile = null;
        state.loading = false;
        state.error = action.payload as string;
      })
      // Link user to node
      .addCase(linkUserToNode.fulfilled, (state, action) => {
        if (state.userProfile) {
          state.userProfile.peopleId = action.payload.personId;
          state.userProfile.villages = action.payload.villages;
        }
      })
      // Update User Profile
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        if (state.userProfile) {
          state.userProfile.name = action.payload.name;
          state.userProfile.displayName = action.payload.name;
          state.userProfile.phone = action.payload.phone;
        }
      });
  },
});

export const { setCurrentUser, clearError, setResetPasswordMode } = authSlice.actions;

// Selectors
export const selectCurrentUser = (state: any) => state.auth.currentUser;
export const selectUserProfile = (state: any) => state.auth.userProfile;
export const selectAuthLoading = (state: any) => state.auth.loading;
export const selectAuthError = (state: any) => state.auth.error;
export const selectResetPasswordMode = (state: any) => state.auth.resetPasswordMode;

// Permission helper selectors
export const selectIsSuperAdmin = (state: any) =>
  state.auth.userProfile?.role === 'superadmin';

export const selectIsAdmin = (state: any) =>
  state.auth.userProfile?.role === 'admin' || state.auth.userProfile?.role === 'superadmin';

export const selectCanManageVillage = (villageId: string) => (state: any) => {
  const profile = state.auth.userProfile;
  if (!profile) return false;
  if (profile.role === 'superadmin') return true;
  if (profile.role === 'admin' && profile.villages.includes(villageId)) return true;
  return false;
};

export const selectHasPermission = (requiredRole?: UserRole, villageId?: string) => (state: any) => {
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

  if (villageId && profile.role !== 'superadmin') {
    return profile.villages.includes(villageId);
  }

  return true;
};

export default authSlice.reducer;
