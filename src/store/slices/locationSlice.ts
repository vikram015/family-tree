/**
 * Location Slice - Redux state for states, districts, and villages
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SupabaseService } from '../../services/supabaseService';

interface State {
  id: string;
  name: string;
  created_at?: string;
  modified_at?: string;
  is_deleted?: boolean;
}

interface District {
  id: string;
  name: string;
  state_id: string;
  created_at?: string;
  modified_at?: string;
  is_deleted?: boolean;
}

interface LocationState {
  states: State[];
  districts: District[];
  statesLoading: boolean;
  districtsLoading: boolean;
  error: string | null;
}

const initialState: LocationState = {
  states: [],
  districts: [],
  statesLoading: false,
  districtsLoading: false,
  error: null,
};

// Thunks
export const fetchStates = createAsyncThunk(
  'location/fetchStates',
  async () => {
    return await SupabaseService.getStates();
  }
);

export const fetchDistricts = createAsyncThunk(
  'location/fetchDistricts',
  async (stateId?: string) => {
    return await SupabaseService.getDistricts(stateId);
  }
);

export const fetchAllDistricts = createAsyncThunk(
  'location/fetchAllDistricts',
  async () => {
    return await SupabaseService.getDistricts();
  }
);

// Slice
const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    clearDistricts: (state) => {
      state.districts = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch States
    builder.addCase(fetchStates.pending, (state) => {
      state.statesLoading = true;
      state.error = null;
    });
    builder.addCase(fetchStates.fulfilled, (state, action: PayloadAction<State[]>) => {
      state.statesLoading = false;
      state.states = action.payload;
    });
    builder.addCase(fetchStates.rejected, (state, action) => {
      state.statesLoading = false;
      state.error = action.error.message || 'Failed to fetch states';
    });

    // Fetch Districts
    builder.addCase(fetchDistricts.pending, (state) => {
      state.districtsLoading = true;
      state.error = null;
    });
    builder.addCase(fetchDistricts.fulfilled, (state, action: PayloadAction<District[]>) => {
      state.districtsLoading = false;
      state.districts = action.payload;
    });
    builder.addCase(fetchDistricts.rejected, (state, action) => {
      state.districtsLoading = false;
      state.error = action.error.message || 'Failed to fetch districts';
    });

    // Fetch All Districts
    builder.addCase(fetchAllDistricts.pending, (state) => {
      state.districtsLoading = true;
      state.error = null;
    });
    builder.addCase(fetchAllDistricts.fulfilled, (state, action: PayloadAction<District[]>) => {
      state.districtsLoading = false;
      state.districts = action.payload;
    });
    builder.addCase(fetchAllDistricts.rejected, (state, action) => {
      state.districtsLoading = false;
      state.error = action.error.message || 'Failed to fetch districts';
    });
  },
});

// Actions
export const { clearDistricts } = locationSlice.actions;

// Selectors
export const selectStates = (state: any) => state.location.states;
export const selectDistricts = (state: any) => state.location.districts;
export const selectStatesLoading = (state: any) => state.location.statesLoading;
export const selectDistrictsLoading = (state: any) => state.location.districtsLoading;
export const selectLocationError = (state: any) => state.location.error;

export default locationSlice.reducer;
