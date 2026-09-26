/**
 * Location Slice - Redux state for the selectable location list plus the
 * state/district lookup hierarchy. (Merged from the former village slice.)
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ApiService } from '../../services/apiService';

interface LocationItem {
  id: string;
  name: string;
  districtId?: string;
  createdAt?: string;
}

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
  locations: LocationItem[];
  selectedLocation: string;
  locationsLoading: boolean;
  states: State[];
  districts: District[];
  statesLoading: boolean;
  districtsLoading: boolean;
  error: string | null;
}

const initialState: LocationState = {
  locations: [],
  selectedLocation: '',
  locationsLoading: true,
  states: [],
  districts: [],
  statesLoading: false,
  districtsLoading: false,
  error: null,
};

function normalizeState(row: any): State {
  return { ...row, createdAt: row?.createdAt };
}

function normalizeDistrict(row: any): District {
  return { ...row, stateId: row?.stateId, createdAt: row?.createdAt };
}

// Thunks
export const fetchLocations = createAsyncThunk(
  'location/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const data = await ApiService.getLocations();
      const list: LocationItem[] = (data || []).map((location: any) => ({
        id: location.id,
        name: location.name,
        districtId: location.districtId || location.district?.id || undefined,
        createdAt: location.createdAt,
      }));
      return list;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchStates = createAsyncThunk('location/fetchStates', async () => {
  return await ApiService.getStates();
});

export const fetchDistricts = createAsyncThunk(
  'location/fetchDistricts',
  async (stateId?: string) => {
    return await ApiService.getDistricts(stateId);
  },
);

export const fetchAllDistricts = createAsyncThunk('location/fetchAllDistricts', async () => {
  return await ApiService.getDistricts();
});

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setSelectedLocation: (state, action: PayloadAction<string>) => {
      state.selectedLocation = action.payload;
    },
    clearDistricts: (state) => {
      state.districts = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Location list
    builder.addCase(fetchLocations.pending, (state) => {
      state.locationsLoading = true;
    });
    builder.addCase(fetchLocations.fulfilled, (state, action: PayloadAction<LocationItem[]>) => {
      state.locations = (action.payload || []).slice().sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
      state.locationsLoading = false;
      state.error = null;
      if (state.locations.length > 0 && !state.selectedLocation) {
        state.selectedLocation = state.locations[0].id;
      }
    });
    builder.addCase(fetchLocations.rejected, (state, action) => {
      state.locationsLoading = false;
      state.error = action.payload as string;
    });

    // States
    builder.addCase(fetchStates.pending, (state) => {
      state.statesLoading = true;
      state.error = null;
    });
    builder.addCase(fetchStates.fulfilled, (state, action: PayloadAction<State[]>) => {
      state.statesLoading = false;
      state.states = (action.payload || []).map(normalizeState).slice().sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
    });
    builder.addCase(fetchStates.rejected, (state, action) => {
      state.statesLoading = false;
      state.error = action.error.message || 'Failed to fetch states';
    });

    // Districts
    const districtsFulfilled = (state: LocationState, action: PayloadAction<District[]>) => {
      state.districtsLoading = false;
      state.districts = (action.payload || []).map(normalizeDistrict).slice().sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
    };
    builder.addCase(fetchDistricts.pending, (state) => {
      state.districtsLoading = true;
      state.error = null;
    });
    builder.addCase(fetchDistricts.fulfilled, districtsFulfilled);
    builder.addCase(fetchDistricts.rejected, (state, action) => {
      state.districtsLoading = false;
      state.error = action.error.message || 'Failed to fetch districts';
    });
    builder.addCase(fetchAllDistricts.pending, (state) => {
      state.districtsLoading = true;
      state.error = null;
    });
    builder.addCase(fetchAllDistricts.fulfilled, districtsFulfilled);
    builder.addCase(fetchAllDistricts.rejected, (state, action) => {
      state.districtsLoading = false;
      state.error = action.error.message || 'Failed to fetch districts';
    });
  },
});

// Actions
export const { setSelectedLocation, clearDistricts, clearError } = locationSlice.actions;

// Selectors
export const selectLocations = (state: any) => state.location.locations;
export const selectSelectedLocation = (state: any) => state.location.selectedLocation;
export const selectLocationLoading = (state: any) => state.location.locationsLoading;
export const selectStates = (state: any) => state.location.states;
export const selectDistricts = (state: any) => state.location.districts;
export const selectStatesLoading = (state: any) => state.location.statesLoading;
export const selectDistrictsLoading = (state: any) => state.location.districtsLoading;
export const selectLocationError = (state: any) => state.location.error;

export default locationSlice.reducer;
