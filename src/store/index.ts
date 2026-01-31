import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import villageReducer from './slices/villageSlice';
import businessReducer from './slices/businessSlice';
import professionReducer from './slices/professionSlice';
import statisticsReducer from './slices/statisticsSlice';
import locationReducer from './slices/locationSlice';
import casteReducer from './slices/casteSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    village: villageReducer,
    business: businessReducer,
    profession: professionReducer,
    statistics: statisticsReducer,
    location: locationReducer,
    caste: casteReducer,
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
