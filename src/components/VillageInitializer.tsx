import { useEffect } from "react";
import { useAppDispatch } from "../store/hooks";
import { fetchVillages } from "../store/slices/villageSlice";

/**
 * Component to handle village data initialization
 * No isMounted flags needed - Redux actions can safely complete after component unmounts
 */
export function VillageInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    console.log("VillageInitializer: Fetching villages");
    dispatch(fetchVillages());
  }, [dispatch]);

  return <>{children}</>;
}
