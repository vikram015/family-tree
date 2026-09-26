/**
 * Normalizes a proper-noun string (caste, sub-caste, location, …) to Title Case:
 * the first letter of each word is capitalized and the rest lower-cased, so that
 * inconsistently-stored values ("GURJAR", "new delhi") render uniformly
 * ("Gurjar", "New Delhi").
 *
 * Non-Latin scripts (e.g. Devanagari) have no case and are left untouched — only
 * ASCII letters are affected, so Hindi names pass through unchanged.
 */
export function toTitleCase(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s\-/(.])([a-z])/g, (_match, boundary, letter) => boundary + letter.toUpperCase());
}
