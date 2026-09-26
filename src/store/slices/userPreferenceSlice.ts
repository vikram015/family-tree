import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ApiService, UserPreference } from "../../services/apiService";
import { logout, updateAuthState } from "./authSlice";

export const DEFAULT_USER_PREFERENCE: UserPreference = {
  showFullTree: true,
  showSpouse: true,
  language: "Hindi",
};

interface UserPreferenceState {
  preference: UserPreference;
  loading: boolean;
  saving: boolean;
  loaded: boolean;
  error: string | null;
}

const initialState: UserPreferenceState = {
  preference: DEFAULT_USER_PREFERENCE,
  loading: false,
  saving: false,
  loaded: false,
  error: null,
};

export const fetchUserPreference = createAsyncThunk(
  "userPreference/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiService.getUserPreference();
      return response.preference || DEFAULT_USER_PREFERENCE;
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to fetch user preference");
    }
  },
);

export const updateUserPreference = createAsyncThunk(
  "userPreference/update",
  async (updates: Partial<UserPreference>, { rejectWithValue }) => {
    try {
      const response = await ApiService.updateUserPreference(updates);
      return response.preference || DEFAULT_USER_PREFERENCE;
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to update user preference");
    }
  },
);

const userPreferenceSlice = createSlice({
  name: "userPreference",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserPreference.pending, (state) => {
        state.loading = true;
        state.loaded = false;
        state.error = null;
      })
      .addCase(fetchUserPreference.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.preference = {
          ...DEFAULT_USER_PREFERENCE,
          ...action.payload,
        };
      })
      .addCase(fetchUserPreference.rejected, (state, action) => {
        state.loading = false;
        state.loaded = false;
        state.error = action.payload as string;
      })
      .addCase(updateUserPreference.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateUserPreference.fulfilled, (state, action) => {
        state.saving = false;
        state.loaded = true;
        state.preference = {
          ...DEFAULT_USER_PREFERENCE,
          ...action.payload,
        };
      })
      .addCase(updateUserPreference.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(logout.fulfilled, () => initialState)
      .addCase(updateAuthState.fulfilled, (state, action) => {
        if (!action.payload.currentUser) {
          return initialState;
        }
        return state;
      })
      .addCase(updateAuthState.rejected, () => initialState);
  },
});

export const selectUserPreference = (state: any) =>
  state.userPreference.preference;
export const selectUserPreferenceLoading = (state: any) =>
  state.userPreference.loading;
export const selectUserPreferenceLoaded = (state: any) =>
  state.userPreference.loaded;
export const selectUserPreferenceSaving = (state: any) =>
  state.userPreference.saving;
export const selectUserPreferenceError = (state: any) =>
  state.userPreference.error;

export default userPreferenceSlice.reducer;
