import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchLocations,
  selectLocations,
  selectLocationLoading,
  setSelectedLocation,
} from "../store/slices/locationSlice";
import {
  fetchAllSubCastes,
  fetchCastes,
  selectCastes,
  selectSubCastes,
} from "../store/slices/casteSlice";
import { useAuth } from "./hooks/useAuth";

/**
 * Component to handle location data initialization
 * Retries on failure to ensure mobile devices always load locations
 */
export function LocationInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const locations = useAppSelector(selectLocations);
  const loading = useAppSelector(selectLocationLoading);
  const castes = useAppSelector(selectCastes);
  const subCastes = useAppSelector(selectSubCastes);
  const retryCount = useRef(0);
  const { userProfile } = useAuth();
  const appliedUserLocationRef = useRef(false);

  // Default the selected location to the logged-in user's primary assigned
  // location (once per session). Everyone can still browse all locations.
  useEffect(() => {
    const primary = userProfile?.locations?.[0];
    if (primary && !appliedUserLocationRef.current) {
      appliedUserLocationRef.current = true;
      dispatch(setSelectedLocation(primary));
    }
    if (!userProfile) {
      appliedUserLocationRef.current = false;
    }
  }, [userProfile, dispatch]);

  useEffect(() => {
    console.log("LocationInitializer: Fetching locations");
    dispatch(fetchLocations());
  }, [dispatch]);

  useEffect(() => {
    if (castes.length === 0) {
      dispatch(fetchCastes());
    }
    if (subCastes.length === 0) {
      dispatch(fetchAllSubCastes());
    }
  }, [dispatch, castes.length, subCastes.length]);

  // Retry if locations failed to load (empty after loading finished)
  useEffect(() => {
    if (!loading && locations.length === 0 && retryCount.current < 3) {
      const timer = setTimeout(
        () => {
          retryCount.current += 1;
          console.log(`LocationInitializer: Retry ${retryCount.current}/3`);
          dispatch(fetchLocations());
        },
        2000 * retryCount.current + 1000,
      );
      return () => clearTimeout(timer);
    }
  }, [loading, locations.length, dispatch]);

  return <>{children}</>;
}
