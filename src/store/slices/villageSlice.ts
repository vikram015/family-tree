import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ApiService } from '../../services/apiService';

interface Village {
  id: string;
  name: string;
  districtId?: string;
  createdAt?: string;
}

interface VillageState {
  villages: Village[];
  selectedVillage: string;
  loading: boolean;
  error: string | null;
}

const initialState: VillageState = {
  villages: [],
  selectedVillage: '',
  loading: true,
  error: null,
};

// Async thunks
export const fetchVillages = createAsyncThunk(
  'village/fetchVillages',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Redux: Starting to fetch villages');
      const villageData = await ApiService.getVillages();
      console.log('Redux: Villages fetched:', villageData);
      
      const villageList: Village[] = villageData.map((village: any) => ({
        id: village.id,
        name: village.name,
        districtId: village.districtId || village.district?.id || undefined,
        createdAt: village.createdAt,
      }));

      return villageList;
    } catch (error: any) {
      console.error('Redux: Failed to load villages:', error);
      return rejectWithValue(error.message);
    }
  }
);

const villageSlice = createSlice({
  name: 'village',
  initialState,
  reducers: {
    setSelectedVillage: (state, action: PayloadAction<string>) => {
      state.selectedVillage = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVillages.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchVillages.fulfilled, (state, action) => {
        // Sort villages alphabetically by name
        state.villages = (action.payload || []).slice().sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        );
        state.loading = false;
        state.error = null;

        // Auto-select first village if none selected
        if (state.villages.length > 0 && !state.selectedVillage) {
          state.selectedVillage = state.villages[0].id;
        }
      })
      .addCase(fetchVillages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedVillage, clearError } = villageSlice.actions;

// Selectors
export const selectVillages = (state: any) => state.village.villages;
export const selectSelectedVillage = (state: any) => state.village.selectedVillage;
export const selectVillageLoading = (state: any) => state.village.loading;
export const selectVillageError = (state: any) => state.village.error;

export default villageSlice.reducer;

