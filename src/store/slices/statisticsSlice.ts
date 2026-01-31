import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SupabaseService } from '../../services/supabaseService';

interface StatisticsState {
  statistics: any | null;
  loading: boolean;
  error: string | null;
}

const initialState: StatisticsState = {
  statistics: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchDashboardStatistics = createAsyncThunk(
  'statistics/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Redux: Starting to fetch statistics');
      const stats = await SupabaseService.getDashboardStatistics();
      console.log('Redux: Statistics fetched:', stats);
      return stats;
    } catch (error: any) {
      console.error('Redux: Error fetching statistics:', error);
      return rejectWithValue(error.message);
    }
  }
);

const statisticsSlice = createSlice({
  name: 'statistics',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStatistics.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDashboardStatistics.fulfilled, (state, action) => {
        state.statistics = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchDashboardStatistics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = statisticsSlice.actions;

// Selectors
export const selectStatistics = (state: any) => state.statistics.statistics;
export const selectStatisticsLoading = (state: any) => state.statistics.loading;
export const selectStatisticsError = (state: any) => state.statistics.error;

export default statisticsSlice.reducer;
