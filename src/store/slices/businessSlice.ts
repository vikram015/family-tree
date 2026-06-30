import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ApiService } from '../../services/apiService';

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
  loadedVillageId: string | null;
}

const initialState: BusinessState = {
  businesses: [],
  loading: false,
  loadedVillageId: null,
  error: null,
};

// Async thunks
export const fetchBusinessesByVillage = createAsyncThunk(
  'business/fetchByVillage',
  async (villageId: string, { rejectWithValue }) => {
    try {
      console.log('Redux: Starting to fetch businesses for village:', villageId);
      const businessesWithHierarchy = await ApiService.getBusinessesByVillageWithHierarchy(villageId);
      console.log('Redux: Businesses fetched:', businessesWithHierarchy);

      const businessList: Business[] = businessesWithHierarchy.map((business: any) => ({
        id: business.businessId,
        name: business.businessName,
        category: business.businessCategory || '',
        description: business.businessDescription || '',
        owner: business.personName || '',
        ownerId: business.personId || '',
        ownerName: business.personName || '',
        contact: business.businessContact || '',
        villageId: villageId,
        treeId: business.treeId || '',
        gender: business.personGender || '',
        dob: business.personDob || '',
        hierarchy: business.parentHierarchy || [],
        casteName: business.casteName || '',
        subCasteName: business.subCasteName || '',
        createdAt: business.businessCreatedAt,
        updatedAt: business.businessCreatedAt,
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
      state.loadedVillageId = null;
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
        state.loadedVillageId = action.meta.arg;
      })
      .addCase(fetchBusinessesByVillage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.loadedVillageId = action.meta.arg;
      });
  },
});

export const { clearBusinesses, clearError } = businessSlice.actions;

// Selectors
export const selectBusinesses = (state: any) => state.business.businesses;
export const selectBusinessLoading = (state: any) => state.business.loading;
export const selectBusinessLoadedVillageId = (state: any) =>
  state.business.loadedVillageId;
export const selectBusinessError = (state: any) => state.business.error;

export default businessSlice.reducer;

