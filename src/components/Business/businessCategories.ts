// Canonical list of business categories shared across the app (Business page
// and one business's profile, Profile page, Add-node flow, and node details).
// Stored value is the `id`.
//
// `title`/`description` describe the category on the browse page; `color` tints
// its chip and icon everywhere, so a category looks the same wherever it shows
// up. The icon lives in ./businessCategoryIcon (JSX cannot live in a .ts file).
export interface BusinessCategoryOption {
  id: string;
  displayName: string;
  /** Heading used where the category is presented as a section. */
  title: string;
  description: string;
  color: string;
}

export const BUSINESS_CATEGORY_OPTIONS: BusinessCategoryOption[] = [
  {
    id: "retail",
    displayName: "Retail & Shops",
    title: "Retail & Shops",
    description: "Family-owned stores, boutiques, and retail businesses",
    color: "#d97706",
  },
  {
    id: "agriculture",
    displayName: "Agriculture & Farming",
    title: "Agriculture & Farming",
    description: "Agricultural businesses, farming, and related services",
    color: "#16a34a",
  },
  {
    id: "it",
    displayName: "IT & Technology",
    title: "IT & Technology",
    description: "Software development, IT services, and tech professionals",
    color: "#0d6efd",
  },
  {
    id: "education",
    displayName: "Education",
    title: "Education",
    description: "Teachers, tutors, coaching centers, and educational services",
    color: "#0891b2",
  },
  {
    id: "healthcare",
    displayName: "Healthcare",
    title: "Healthcare",
    description: "Doctors, nurses, clinics, and medical professionals",
    color: "#dc2626",
  },
  {
    id: "engineering",
    displayName: "Engineering & Construction",
    title: "Engineering & Construction",
    description: "Engineers, contractors, and construction businesses",
    color: "#7c3aed",
  },
  {
    id: "properties",
    displayName: "Properties & Real Estate",
    title: "Properties & Real Estate",
    description: "Real estate agents, property management, and property sales",
    color: "#475569",
  },
];

const optionById = new Map(BUSINESS_CATEGORY_OPTIONS.map((c) => [c.id, c]));

/** Categories are free text in the database; compare them case-insensitively. */
export const normalizeCategory = (value?: string | null) =>
  value?.trim().toLowerCase() || "";

/**
 * Prettifies a slug-shaped category ("real_estate" -> "Real Estate").
 *
 * Applied only to values that look like slugs — all lower case, no spaces.
 * Text a person typed is left exactly as they typed it, so "IT consulting"
 * does not come back as "It Consulting".
 */
export const titleCaseCategory = (value: string) => {
  const trimmed = value.trim();
  const isSlug = /^[a-z0-9]+([-_][a-z0-9]+)*$/.test(trimmed);
  if (!isSlug) return trimmed;
  return trimmed
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export function isPresetCategory(value?: string | null): boolean {
  return Boolean(value && optionById.has(normalizeCategory(value)));
}

export function getCategoryMeta(
  value?: string | null,
): BusinessCategoryOption | undefined {
  return optionById.get(normalizeCategory(value));
}

/** Tint for a category's chip and icon. Neutral slate for anything unlisted. */
export function businessCategoryColor(value?: string | null): string {
  return getCategoryMeta(value)?.color || "#475569";
}

/** Human-readable label for a stored category value (preset id or free text). */
export function businessCategoryLabel(value?: string | null): string {
  if (!value?.trim()) return "";
  // Presets are matched case-insensitively; anything else keeps the author's
  // own wording, tidied only if it is a slug.
  return getCategoryMeta(value)?.displayName || titleCaseCategory(value);
}
