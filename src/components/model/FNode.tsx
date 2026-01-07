import type { ExtNode } from "relatives-tree/lib/types";
export type FNode = ExtNode & {
  name: string;
  dob: string;
  dod?: string; // Date of Death
  place?: string; // Place (birthplace or current location)
  notes?: string; // Additional notes
  photo?: string; // Photo URL
  customFields?: Record<string, string>; // Dynamic custom fields
};
