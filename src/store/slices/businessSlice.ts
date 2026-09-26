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
  ownerUserId: string;
  contact: string;
  locationId: string;
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
  loadedLocationId: string | null;
}

const initialState: BusinessState = {
  businesses: [],
  loading: false,
  loadedLocationId: null,
  error: null,
};

// Async thunks
export const fetchBusinessesByLocation = createAsyncThunk(
  'business/fetchByLocation',
  async (locationId: string, { rejectWithValue }) => {
    try {
      console.log('Redux: Starting to fetch businesses for location:', locationId);
      const businessesWithHierarchy = await ApiService.getBusinessesByLocationWithHierarchy(locationId);
      console.log('Redux: Businesses fetched:', businessesWithHierarchy);

      const businessList: Business[] = businessesWithHierarchy.map((business: any) => ({
        id: business.businessId,
        name: business.businessName,
        category: business.businessCategory || '',
        description: business.businessDescription || '',
        owner: business.personName || '',
        ownerId: business.personId || '',
        ownerName: business.personName || '',
        ownerUserId: business.ownerUserId || '',
        contact: business.businessContact || '',
        locationId: locationId,
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
      state.loadedLocationId = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBusinessesByLocation.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchBusinessesByLocation.fulfilled, (state, action) => {
        state.businesses = action.payload;
        state.loading = false;
        state.error = null;
        state.loadedLocationId = action.meta.arg;
      })
      .addCase(fetchBusinessesByLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.loadedLocationId = action.meta.arg;
      });
  },
});

export const { clearBusinesses, clearError } = businessSlice.actions;

// Selectors
export const selectBusinesses = (state: any) => state.business.businesses;
export const selectBusinessLoading = (state: any) => state.business.loading;
export const selectBusinessLoadedLocationId = (state: any) =>
  state.business.loadedLocationId;
export const selectBusinessError = (state: any) => state.business.error;

export default businessSlice.reducer;

