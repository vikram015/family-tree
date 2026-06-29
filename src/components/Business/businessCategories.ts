// Canonical list of business categories shared across the app (Business page,
// Profile page, Add-node flow, and node details). Stored value is the `id`.
export interface BusinessCategoryOption {
  id: string;
  displayName: string;
}

export const BUSINESS_CATEGORY_OPTIONS: BusinessCategoryOption[] = [
  { id: "retail", displayName: "Retail & Shops" },
  { id: "agriculture", displayName: "Agriculture & Farming" },
  { id: "it", displayName: "IT & Technology" },
  { id: "education", displayName: "Education" },
  { id: "healthcare", displayName: "Healthcare" },
  { id: "engineering", displayName: "Engineering & Construction" },
  { id: "properties", displayName: "Properties & Real Estate" },
];

const optionById = new Map(BUSINESS_CATEGORY_OPTIONS.map((c) => [c.id, c]));

export function isPresetCategory(value?: string | null): boolean {
  return Boolean(value && optionById.has(value));
}

/** Human-readable label for a stored category value (preset id or free text). */
export function businessCategoryLabel(value?: string | null): string {
  if (!value) return "";
  return optionById.get(value)?.displayName || value;
}
