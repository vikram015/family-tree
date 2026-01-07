import React, { createContext, useContext, useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";

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

  // Load villages from Firestore
  useEffect(() => {
    const villagesRef = collection(db, "villages");
    const unsubscribe = onSnapshot(villagesRef, (snapshot) => {
      const villageList: Village[] = [];
      snapshot.forEach((doc) => {
        villageList.push({
          id: doc.id,
          name: doc.data().name,
        });
      });
      console.log("Loaded villages from Firestore:", villageList);
      setVillages(villageList);
      setLoading(false);

      // Auto-select first village if none selected
      if (villageList.length > 0 && !selectedVillage) {
        console.log("Auto-selecting first village:", villageList[0].id);
        setSelectedVillage(villageList[0].id);
      }
    });

    return unsubscribe;
  }, [selectedVillage]);

  // Persist selected village to localStorage
  useEffect(() => {
    if (selectedVillage) {
      console.log("Selected village changed to:", selectedVillage);
      localStorage.setItem("selectedVillage", selectedVillage);
    }
  }, [selectedVillage]);

  const value = {
    selectedVillage,
    setSelectedVillage,
    villages,
    loading,
  };

  return (
    <VillageContext.Provider value={value}>{children}</VillageContext.Provider>
  );
}
