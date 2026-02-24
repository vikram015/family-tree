/**
 * Compatibility hook for migrating from VillageContext to Redux
 * Provides the same API as the old Context hook
 */
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useCallback } from 'react';
import {
  selectVillages,
  selectSelectedVillage,
  selectVillageLoading,
  setSelectedVillage as setSelectedVillageAction,
} from '../../store/slices/villageSlice';

/**
 * Hook to replace useVillage() from VillageContext
 * Provides same API but backed by Redux
 */
export function useVillage() {
  const dispatch = useAppDispatch();
  const villages = useAppSelector(selectVillages);
  const selectedVillage = useAppSelector(selectSelectedVillage);
  const loading = useAppSelector(selectVillageLoading);
  const setSelectedVillage = useCallback(
    (villageId: string) => dispatch(setSelectedVillageAction(villageId)),
    [dispatch],
  );

  return {
    villages,
    selectedVillage,
    loading,
    setSelectedVillage,
  };
}
