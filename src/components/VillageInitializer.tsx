import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchVillages,
  selectVillages,
  selectVillageLoading,
} from "../store/slices/villageSlice";
import {
  fetchAllSubCastes,
  fetchCastes,
  selectCastes,
  selectSubCastes,
} from "../store/slices/casteSlice";

/**
 * Component to handle village data initialization
 * Retries on failure to ensure mobile devices always load villages
 */
export function VillageInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const villages = useAppSelector(selectVillages);
  const loading = useAppSelector(selectVillageLoading);
  const castes = useAppSelector(selectCastes);
  const subCastes = useAppSelector(selectSubCastes);
  const retryCount = useRef(0);

  useEffect(() => {
    console.log("VillageInitializer: Fetching villages");
    dispatch(fetchVillages());
  }, [dispatch]);

  useEffect(() => {
    if (castes.length === 0) {
      dispatch(fetchCastes());
    }
    if (subCastes.length === 0) {
      dispatch(fetchAllSubCastes());
    }
  }, [dispatch, castes.length, subCastes.length]);

  // Retry if villages failed to load (empty after loading finished)
  useEffect(() => {
    if (!loading && villages.length === 0 && retryCount.current < 3) {
      const timer = setTimeout(
        () => {
          retryCount.current += 1;
          console.log(`VillageInitializer: Retry ${retryCount.current}/3`);
          dispatch(fetchVillages());
        },
        2000 * retryCount.current + 1000,
      );
      return () => clearTimeout(timer);
    }
  }, [loading, villages.length, dispatch]);

  return <>{children}</>;
}
