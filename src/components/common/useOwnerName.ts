import { useEffect, useState } from "react";
import { ApiService } from "../../services/apiService";

/**
 * The display name of the person a business or profession is being saved for.
 *
 * Callers that already hold the name pass it in; otherwise it is looked up by
 * id while the dialog is open, so the owner is always spelled out rather than
 * implied by whichever page the dialog happened to be opened from.
 */
export function useOwnerName(
  open: boolean,
  personId?: string | null,
  knownName?: string | null,
): string {
  const [fetchedName, setFetchedName] = useState("");

  useEffect(() => {
    setFetchedName("");
    if (!open || !personId || knownName?.trim()) return;
    let active = true;
    ApiService.getPersonById(personId)
      .then((person) => {
        if (active) setFetchedName(person?.name || "");
      })
      .catch(() => {
        // Header falls back to generic text; nothing else depends on this.
      });
    return () => {
      active = false;
    };
  }, [open, personId, knownName]);

  return knownName?.trim() || fetchedName;
}
