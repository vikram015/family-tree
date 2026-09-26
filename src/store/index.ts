import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import locationReducer from './slices/locationSlice';
import businessReducer from './slices/businessSlice';
import professionReducer from './slices/professionSlice';
import statisticsReducer from './slices/statisticsSlice';
import casteReducer from './slices/casteSlice';
import userPreferenceReducer from './slices/userPreferenceSlice';
import userOnboardingReducer from './slices/userOnboardingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    location: locationReducer,
    business: businessReducer,
    profession: professionReducer,
    statistics: statisticsReducer,
    caste: casteReducer,
    userPreference: userPreferenceReducer,
    userOnboarding: userOnboardingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['auth/setCurrentUser'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.currentUser'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
