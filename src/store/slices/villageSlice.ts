import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SupabaseService } from '../../services/supabaseService';

interface Village {
  id: string;
  name: string;
}

interface VillageState {
  villages: Village[];
  selectedVillage: string;
  loading: boolean;
  error: string | null;
}

const initialState: VillageState = {
  villages: [],
  selectedVillage: (() => {
    const stored = localStorage.getItem('selectedVillage');
    const params = new URLSearchParams(window.location.search);
    return params.get('village') || stored || '';
  })(),
  loading: true,
  error: null,
};

// Async thunks
export const fetchVillages = createAsyncThunk(
  'village/fetchVillages',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Redux: Starting to fetch villages');
      const villageData = await SupabaseService.getVillages();
      console.log('Redux: Villages fetched:', villageData);
      
      const villageList: Village[] = villageData.map((village: any) => ({
        id: village.id,
        name: village.name,
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
      if (action.payload) {
        localStorage.setItem('selectedVillage', action.payload);
      }
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
        state.villages = action.payload;
        state.loading = false;
        state.error = null;
        
        // Auto-select first village if none selected
        if (action.payload.length > 0 && !state.selectedVillage) {
          state.selectedVillage = action.payload[0].id;
          localStorage.setItem('selectedVillage', action.payload[0].id);
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
