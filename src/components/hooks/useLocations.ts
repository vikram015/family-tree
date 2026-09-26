/**
 * Compatibility hook for migrating from LocationContext to Redux
 * Provides the same API as the old Context hook
 */
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useCallback } from 'react';
import {
  selectLocations,
  selectSelectedLocation,
  selectLocationLoading,
  setSelectedLocation as setSelectedLocationAction,
} from '../../store/slices/locationSlice';

/**
 * Hook to replace useLocation() from LocationContext
 * Provides same API but backed by Redux
 */
export function useLocations() {
  const dispatch = useAppDispatch();
  const locations = useAppSelector(selectLocations);
  const selectedLocation = useAppSelector(selectSelectedLocation);
  const loading = useAppSelector(selectLocationLoading);
  const setSelectedLocation = useCallback(
    (locationId: string) => dispatch(setSelectedLocationAction(locationId)),
    [dispatch],
  );

  return {
    locations,
    selectedLocation,
    loading,
    setSelectedLocation,
  };
}
