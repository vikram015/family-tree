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
    const villageId = params.get("village") || stored || "";

    // Validate if it's a UUID format (Firebase IDs are shorter alphanumeric strings)
    // UUID format: 8-4-4-4-12 hexadecimal characters
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (villageId && !uuidRegex.test(villageId)) {
      // Clear invalid (Firebase) village ID from localStorage
      console.log(
        "VillageProvider: Clearing invalid village ID from localStorage:",
        villageId,
      );
      localStorage.removeItem("selectedVillage");
      return "";
    }

    return villageId;
  });
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);

  console.log("VillageProvider: Initializing");

  // Load villages from Supabase
  useEffect(() => {
    let isMounted = true;

    const loadVillages = async () => {
      try {
        if (!isMounted) return;

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
          console.log(
            "VillageProvider: Auto-selecting first village:",
            villageList[0].id,
          );
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
  }, [selectedVillage]);

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
