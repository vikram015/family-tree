import React, { createContext, useContext, useState, useEffect } from "react";
import { SupabaseService } from "../../services/supabaseService";

interface Village {
  id: string;
  name: string;
}

interface VillageContextType {
  selectedVillage: string;
  setSelectedVillage: (villageId: string) => void;
  villages: Village[];
  loading: boolean;
}

const VillageContext = createContext<VillageContextType>({
  selectedVillage: "",
  setSelectedVillage: () => {},
  villages: [],
  loading: true,
});

export function useVillage() {
  return useContext(VillageContext);
}

export function VillageProvider({ children }: { children: React.ReactNode }) {
  const [selectedVillage, setSelectedVillage] = useState<string>(() => {
    // Try to get from localStorage or URL
    const stored = localStorage.getItem("selectedVillage");
    const params = new URLSearchParams(window.location.search);
    return params.get("village") || stored || "";
  });
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);

  console.log("VillageProvider: Initializing");

  // Load villages from Supabase
  useEffect(() => {
    let isMounted = true;

    const loadVillages = async () => {
      try {
        console.log("VillageProvider: Starting to load villages");
        const villageData = await SupabaseService.getVillages();

        if (!isMounted) return;

        console.log("VillageProvider: Villages loaded:", villageData);
        const villageList: Village[] = villageData.map((village: any) => ({
          id: village.id,
          name: village.name,
        }));
        setVillages(villageList);
        setLoading(false);

        // Auto-select first village if none selected
        if (villageList.length > 0 && !selectedVillage) {
          setSelectedVillage(villageList[0].id);
        }
      } catch (error) {
        console.error(
          "VillageProvider: Failed to load villages from Supabase:",
          error,
        );
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadVillages();

    return () => {
      isMounted = false;
    };
  }, []);

  // Persist selected village to localStorage
  useEffect(() => {
    if (selectedVillage) {
      localStorage.setItem("selectedVillage", selectedVillage);
    }
  }, [selectedVillage]);

  const value = {
    selectedVillage,
    setSelectedVillage,
    villages,
    loading,
  };

  console.log("VillageProvider: About to return context provider");
  return (
    <VillageContext.Provider value={value}>{children}</VillageContext.Provider>
  );
}
