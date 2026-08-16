import type { ExtNode } from "relatives-tree/lib/types";
export type FNode = ExtNode & {
  name: string;
  nameHindi?: string;
  dob: string;
  dod?: string; // Date of Death (legacy)
  bloodGroup?: string; // Blood group (A+, B-, O+, etc.)
  isAlive?: boolean; // Whether the person is alive
  deceasedDate?: string; // Date of death
  place?: string; // Place (birthplace or current location)
  notes?: string; // Additional notes
  photo?: string; // Photo URL
  createdAt?: string; // Created timestamp
  createdBy?: string; // User ID who created this person
  createdByName?: string; // Display name/email of the creator
  customFields?: Record<string, string>; // Dynamic custom fields
  hierarchy?: Array<{ name: string; id: string }>; // Complete parent chain hierarchy
  treeId?: string; // Tree ID this node belongs to
  locationId?: string; // Location ID this node belongs to
  locationName?: string; // Location name
  name_lowercase?: string; // Lowercase name for case-insensitive search
  relationStartDate?: string; // Optional relation start date when creating/linking spouse
  relationEndDate?: string; // Optional relation end date when creating/linking spouse
  relationSubtype?: string; // Optional spouse relation subtype (married/divorced)
};
