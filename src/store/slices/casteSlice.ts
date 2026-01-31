/**
 * Caste Slice - Redux state for castes and sub-castes
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SupabaseService } from '../../services/supabaseService';

interface Caste {
  id: string;
  name: string;
  created_at?: string;
  modified_at?: string;
  is_deleted?: boolean;
}

interface SubCaste {
  id: string;
  name: string;
  caste_id: string;
  created_at?: string;
  modified_at?: string;
  is_deleted?: boolean;
}

interface CasteState {
  castes: Caste[];
  subCastes: SubCaste[];
  castesLoading: boolean;
  subCastesLoading: boolean;
  error: string | null;
}

const initialState: CasteState = {
  castes: [],
  subCastes: [],
  castesLoading: false,
  subCastesLoading: false,
  error: null,
};

// Thunks
export const fetchCastes = createAsyncThunk(
  'caste/fetchCastes',
  async () => {
    return await SupabaseService.getCastes();
  }
);

export const fetchSubCastes = createAsyncThunk(
  'caste/fetchSubCastes',
  async (casteId?: string) => {
    return await SupabaseService.getSubCastes(casteId);
  }
);

export const fetchAllSubCastes = createAsyncThunk(
  'caste/fetchAllSubCastes',
  async () => {
    return await SupabaseService.getSubCastes();
  }
);

// Slice
const casteSlice = createSlice({
  name: 'caste',
  initialState,
  reducers: {
    clearSubCastes: (state) => {
      state.subCastes = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch Castes
    builder.addCase(fetchCastes.pending, (state) => {
      state.castesLoading = true;
      state.error = null;
    });
    builder.addCase(fetchCastes.fulfilled, (state, action: PayloadAction<Caste[]>) => {
      state.castesLoading = false;
      state.castes = action.payload;
    });
    builder.addCase(fetchCastes.rejected, (state, action) => {
      state.castesLoading = false;
      state.error = action.error.message || 'Failed to fetch castes';
    });

    // Fetch SubCastes
    builder.addCase(fetchSubCastes.pending, (state) => {
      state.subCastesLoading = true;
      state.error = null;
    });
    builder.addCase(fetchSubCastes.fulfilled, (state, action: PayloadAction<SubCaste[]>) => {
      state.subCastesLoading = false;
      state.subCastes = action.payload;
    });
    builder.addCase(fetchSubCastes.rejected, (state, action) => {
      state.subCastesLoading = false;
      state.error = action.error.message || 'Failed to fetch sub-castes';
    });

    // Fetch All SubCastes
    builder.addCase(fetchAllSubCastes.pending, (state) => {
      state.subCastesLoading = true;
      state.error = null;
    });
    builder.addCase(fetchAllSubCastes.fulfilled, (state, action: PayloadAction<SubCaste[]>) => {
      state.subCastesLoading = false;
      state.subCastes = action.payload;
    });
    builder.addCase(fetchAllSubCastes.rejected, (state, action) => {
      state.subCastesLoading = false;
      state.error = action.error.message || 'Failed to fetch sub-castes';
    });
  },
});

// Actions
export const { clearSubCastes } = casteSlice.actions;

// Selectors
export const selectCastes = (state: any) => state.caste.castes;
export const selectSubCastes = (state: any) => state.caste.subCastes;
export const selectCastesLoading = (state: any) => state.caste.castesLoading;
export const selectSubCastesLoading = (state: any) => state.caste.subCastesLoading;
export const selectCasteError = (state: any) => state.caste.error;

export default casteSlice.reducer;
