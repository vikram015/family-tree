import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SupabaseService } from '../../services/supabaseService';

interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  owner: string;
  ownerId: string;
  ownerName: string;
  contact: string;
  villageId: string;
  treeId: string;
  gender: string;
  dob: string;
  hierarchy: any[];
  casteName: string;
  subCasteName: string;
  createdAt: string;
  updatedAt: string;
}

interface BusinessState {
  businesses: Business[];
  loading: boolean;
  error: string | null;
}

const initialState: BusinessState = {
  businesses: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchBusinessesByVillage = createAsyncThunk(
  'business/fetchByVillage',
  async (villageId: string, { rejectWithValue }) => {
    try {
      console.log('Redux: Starting to fetch businesses for village:', villageId);
      const businessesWithHierarchy = await SupabaseService.getBusinessesByVillageWithHierarchy(villageId);
      console.log('Redux: Businesses fetched:', businessesWithHierarchy);

      const businessList: Business[] = businessesWithHierarchy.map((business: any) => ({
        id: business.business_id,
        name: business.business_name,
        category: business.business_category || '',
        description: business.business_description || '',
        owner: business.person_name || '',
        ownerId: business.person_id || '',
        ownerName: business.person_name || '',
        contact: business.business_contact || '',
        villageId: villageId,
        treeId: business.tree_id || '',
        gender: business.person_gender || '',
        dob: business.person_dob || '',
        hierarchy: business.parent_hierarchy || [],
        casteName: business.caste_name || '',
        subCasteName: business.sub_caste_name || '',
        createdAt: business.business_created_at,
        updatedAt: business.business_created_at,
      }));

      return businessList;
    } catch (error: any) {
      console.error('Redux: Error fetching businesses:', error);
      return rejectWithValue(error.message);
    }
  }
);

const businessSlice = createSlice({
  name: 'business',
  initialState,
  reducers: {
    clearBusinesses: (state) => {
      state.businesses = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBusinessesByVillage.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBusinessesByVillage.fulfilled, (state, action) => {
        state.businesses = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchBusinessesByVillage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearBusinesses, clearError } = businessSlice.actions;

// Selectors
export const selectBusinesses = (state: any) => state.business.businesses;
export const selectBusinessLoading = (state: any) => state.business.loading;
export const selectBusinessError = (state: any) => state.business.error;

export default businessSlice.reducer;
