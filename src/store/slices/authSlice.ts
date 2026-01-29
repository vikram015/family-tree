import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '../../supabase';
import { AppUser, UserRole } from '../../components/model/User';

interface AuthState {
  currentUser: any;
  userProfile: AppUser | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  currentUser: null,
  userProfile: null,
  loading: true,
  error: null,
};

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
      return rejectWithValue(error.message);
    }
  }
);

export const signUpWithEmail = createAsyncThunk(
  'auth/signUp',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('No user returned from signup');

      const user = data.user;

      // Check if user profile exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user profile:', fetchError);
      }

      if (!existingUser) {
        const newUserProfile: Omit<AppUser, 'id'> = {
          email: user.email || '',
          role: 'admin',
          villages: [],
          displayName: user.email?.split('@')[0] || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert([{ id: user.id, ...newUserProfile }]);

        if (insertError) throw new Error(insertError.message);

        return {
          currentUser: user,
          userProfile: { ...newUserProfile, id: user.id } as AppUser,
        };
      }

      return {
        currentUser: user,
        userProfile: { id: user.id, ...existingUser } as AppUser,
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
        return {
          currentUser: user,
          userProfile: { id: user.id, ...userProfileData } as AppUser,
        };
      }

      // Create profile if doesn't exist
      const newUserProfile: Omit<AppUser, 'id'> = {
        email: user.email || '',
        role: 'admin',
        villages: [],
        displayName: user.email?.split('@')[0] || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('users')
        .insert([{ id: user.id, ...newUserProfile }]);

      if (insertError) throw new Error(insertError.message);

      return {
        currentUser: user,
        userProfile: { ...newUserProfile, id: user.id } as AppUser,
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

export const updateAuthState = createAsyncThunk(
  'auth/updateState',
  async ({ user }: { user: any }, { rejectWithValue }) => {
    try {
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
      .addCase(updateAuthState.fulfilled, (state, action) => {
        state.currentUser = action.payload.currentUser;
        state.userProfile = action.payload.userProfile;
        state.loading = false;
      });
  },
});

export const { setCurrentUser, clearError } = authSlice.actions;

// Selectors
export const selectCurrentUser = (state: any) => state.auth.currentUser;
export const selectUserProfile = (state: any) => state.auth.userProfile;
export const selectAuthLoading = (state: any) => state.auth.loading;
export const selectAuthError = (state: any) => state.auth.error;

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
