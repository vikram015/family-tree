/**
 * Location Slice - Redux state for states, districts, and villages
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ApiService } from '../../services/apiService';

interface State {
  id: string;
  name: string;
  createdAt?: string;
  modifiedAt?: string;
  isDeleted?: boolean;
}

interface District {
  id: string;
  name: string;
  stateId: string;
  createdAt?: string;
  modifiedAt?: string;
  isDeleted?: boolean;
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

function normalizeState(row: any): State {
  return {
    ...row,
    createdAt: row?.createdAt,
  };
}

function normalizeDistrict(row: any): District {
  return {
    ...row,
    stateId: row?.stateId,
    createdAt: row?.createdAt,
  };
}

// Thunks
export const fetchStates = createAsyncThunk(
  'location/fetchStates',
  async () => {
    return await ApiService.getStates();
  }
);

export const fetchDistricts = createAsyncThunk(
  'location/fetchDistricts',
  async (stateId?: string) => {
    return await ApiService.getDistricts(stateId);
  }
);

export const fetchAllDistricts = createAsyncThunk(
  'location/fetchAllDistricts',
  async () => {
    return await ApiService.getDistricts();
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
      // Sort states alphabetically by name (case-insensitive)
      state.states = (action.payload || []).map(normalizeState).slice().sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
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
      state.districts = (action.payload || []).map(normalizeDistrict).slice().sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
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
      state.districts = (action.payload || []).map(normalizeDistrict).slice().sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
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

