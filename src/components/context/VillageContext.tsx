import React, { createContext, useContext, useState, useEffect } from "react";
import { ApiService } from "../../services/apiService";

interface Location {
  id: string;
  name: string;
}

interface LocationContextType {
  selectedLocation: string;
  setSelectedLocation: (locationId: string) => void;
  locations: Location[];
  loading: boolean;
}

const LocationContext = createContext<LocationContextType>({
  selectedLocation: "",
  setSelectedLocation: () => {},
  locations: [],
  loading: true,
});

export function useLocation() {
  return useContext(LocationContext);
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [selectedLocation, setSelectedLocation] = useState<string>(() => {
    // Try to get from URL
    const params = new URLSearchParams(window.location.search);
    return params.get("location") || "";
  });
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  console.log("LocationProvider: Initializing");

  // Load locations from Supabase
  useEffect(() => {
    let isMounted = true;

    const loadLocations = async () => {
      try {
        if (!isMounted) return;

        console.log("LocationProvider: Starting to load locations");
        const locationData = await ApiService.getLocations();

        if (!isMounted) return;

        console.log("LocationProvider: Locations loaded:", locationData);
        const locationList: Location[] = locationData.map((location: any) => ({
          id: location.id,
          name: location.name,
        }));
        setLocations(locationList);
        setLoading(false);

        // Auto-select first location if none selected
        if (locationList.length > 0 && !selectedLocation) {
          setSelectedLocation(locationList[0].id);
        }
      } catch (error) {
        console.error(
          "LocationProvider: Failed to load locations from Supabase:",
          error,
        );
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLocations();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = {
    selectedLocation,
    setSelectedLocation,
    locations,
    loading,
  };

  console.log("LocationProvider: About to return context provider");
  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

