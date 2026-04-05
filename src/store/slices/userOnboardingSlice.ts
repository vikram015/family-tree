import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  ApiService,
  UserOnboardingData,
  UserOnboardingDataUpdate,
  UserOnboardingResponse,
  UserOnboardingTreeMatch,
} from "../../services/apiService";
import { logout, updateAuthState } from "./authSlice";

const DEFAULT_USER_ONBOARDING_DATA: UserOnboardingData = {
  status: "in_progress",
  currentStep: "profile",
  profile: {
    name: "",
    email: "",
    completedAt: null,
  },
  location: {
    stateId: null,
    districtId: null,
    villageId: null,
    casteId: null,
    subCasteId: null,
    completedAt: null,
  },
  match: {
    searchName: "",
    searchedAt: null,
    selectedTreeId: null,
    selectedPersonId: null,
    action: null,
  },
  completion: {
    completedAt: null,
    result: null,
  },
};

interface UserOnboardingState {
  row: UserOnboardingResponse | null;
  effectiveOnboardingData: UserOnboardingData;
  loading: boolean;
  saving: boolean;
  loaded: boolean;
  error: string | null;
  matchResults: UserOnboardingTreeMatch[];
  matchesLoading: boolean;
  matchesLoaded: boolean;
  matchError: string | null;
}

const initialState: UserOnboardingState = {
  row: null,
  effectiveOnboardingData: DEFAULT_USER_ONBOARDING_DATA,
  loading: false,
  saving: false,
  loaded: false,
  error: null,
  matchResults: [],
  matchesLoading: false,
  matchesLoaded: false,
  matchError: null,
};

function normalizeOnboardingResponse(
  response: UserOnboardingResponse,
): UserOnboardingResponse {
  return {
    ...response,
    effectiveOnboardingData: {
      ...DEFAULT_USER_ONBOARDING_DATA,
      ...response.effectiveOnboardingData,
      profile: {
        ...DEFAULT_USER_ONBOARDING_DATA.profile,
        ...response.effectiveOnboardingData?.profile,
      },
      location: {
        ...DEFAULT_USER_ONBOARDING_DATA.location,
        ...response.effectiveOnboardingData?.location,
      },
      match: {
        ...DEFAULT_USER_ONBOARDING_DATA.match,
        ...response.effectiveOnboardingData?.match,
      },
      completion: {
        ...DEFAULT_USER_ONBOARDING_DATA.completion,
        ...response.effectiveOnboardingData?.completion,
      },
    },
  };
}

export const fetchUserOnboarding = createAsyncThunk(
  "userOnboarding/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await ApiService.getUserOnboarding();
      return normalizeOnboardingResponse(response);
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to fetch onboarding");
    }
  },
);

export const updateUserOnboarding = createAsyncThunk(
  "userOnboarding/update",
  async (updates: UserOnboardingDataUpdate, { rejectWithValue }) => {
    try {
      const response = await ApiService.updateUserOnboarding(updates);
      return normalizeOnboardingResponse(response);
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to update onboarding");
    }
  },
);

export const searchUserOnboardingMatches = createAsyncThunk(
  "userOnboarding/searchMatches",
  async (
    payload: {
      searchName?: string | null;
      villageId: string;
      casteId?: string | null;
      subCasteId?: string | null;
    },
    { rejectWithValue },
  ) => {
    try {
      return await ApiService.searchUserOnboardingMatches(payload);
    } catch (error: any) {
      return rejectWithValue(error?.message || "Failed to search onboarding matches");
    }
  },
);

const userOnboardingSlice = createSlice({
  name: "userOnboarding",
  initialState,
  reducers: {
    clearUserOnboardingMatches(state) {
      state.matchResults = [];
      state.matchesLoaded = false;
      state.matchError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserOnboarding.pending, (state) => {
        state.loading = true;
        state.loaded = false;
        state.error = null;
      })
      .addCase(fetchUserOnboarding.fulfilled, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.row = action.payload;
        state.effectiveOnboardingData = action.payload.effectiveOnboardingData;
      })
      .addCase(fetchUserOnboarding.rejected, (state, action) => {
        state.loading = false;
        state.loaded = false;
        state.error = action.payload as string;
      })
      .addCase(updateUserOnboarding.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateUserOnboarding.fulfilled, (state, action) => {
        state.saving = false;
        state.loaded = true;
        state.row = action.payload;
        state.effectiveOnboardingData = action.payload.effectiveOnboardingData;
      })
      .addCase(updateUserOnboarding.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      })
      .addCase(searchUserOnboardingMatches.pending, (state) => {
        state.matchesLoading = true;
        state.matchesLoaded = false;
        state.matchError = null;
      })
      .addCase(searchUserOnboardingMatches.fulfilled, (state, action) => {
        state.matchesLoading = false;
        state.matchesLoaded = true;
        state.matchResults = action.payload || [];
      })
      .addCase(searchUserOnboardingMatches.rejected, (state, action) => {
        state.matchesLoading = false;
        state.matchesLoaded = false;
        state.matchError = action.payload as string;
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

export const { clearUserOnboardingMatches } = userOnboardingSlice.actions;

export const selectUserOnboardingRow = (state: any) => state.userOnboarding.row;
export const selectEffectiveUserOnboardingData = (state: any) =>
  state.userOnboarding.effectiveOnboardingData;
export const selectUserOnboardingLoading = (state: any) =>
  state.userOnboarding.loading;
export const selectUserOnboardingSaving = (state: any) =>
  state.userOnboarding.saving;
export const selectUserOnboardingLoaded = (state: any) =>
  state.userOnboarding.loaded;
export const selectUserOnboardingError = (state: any) =>
  state.userOnboarding.error;
export const selectUserOnboardingMatchResults = (state: any) =>
  state.userOnboarding.matchResults;
export const selectUserOnboardingMatchesLoading = (state: any) =>
  state.userOnboarding.matchesLoading;
export const selectUserOnboardingMatchesLoaded = (state: any) =>
  state.userOnboarding.matchesLoaded;
export const selectUserOnboardingMatchError = (state: any) =>
  state.userOnboarding.matchError;

export default userOnboardingSlice.reducer;
