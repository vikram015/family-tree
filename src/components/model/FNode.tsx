import type { ExtNode } from "relatives-tree/lib/types";
export type FNode = ExtNode & {
  name: string;
  dob: string;
  dod?: string; // Date of Death (legacy)
  bloodGroup?: string; // Blood group (A+, B-, O+, etc.)
  isAlive?: boolean; // Whether the person is alive
  deceasedDate?: string; // Date of death
  place?: string; // Place (birthplace or current location)
  notes?: string; // Additional notes
  photo?: string; // Photo URL
  customFields?: Record<string, string>; // Dynamic custom fields
  hierarchy?: Array<{ name: string; id: string }>; // Complete parent chain hierarchy
  treeId?: string; // Tree ID this node belongs to
  villageId?: string; // Village ID this node belongs to
  villageName?: string; // Village name
  name_lowercase?: string; // Lowercase name for case-insensitive search
  relationStartDate?: string; // Optional relation start date when creating/linking spouse
  relationEndDate?: string; // Optional relation end date when creating/linking spouse
  relationSubtype?: string; // Optional spouse relation subtype (married/divorced)
};
