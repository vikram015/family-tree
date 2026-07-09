/**
 * Loose, case-insensitive name comparison used to decide whether a person node
 * the user is claiming plausibly matches the name they searched with / their own
 * profile name. It mirrors the substring highlight used elsewhere in onboarding:
 * a match is when either name contains the other (after trim/lowercase).
 *
 * When there is nothing to compare against (either side blank) it returns `true`
 * so callers don't warn without a basis.
 */
export function namesLooselyMatch(
  nodeName?: string | null,
  searchName?: string | null,
): boolean {
  const a = (nodeName || "").trim().toLowerCase().replace(/\s+/g, " ");
  const b = (searchName || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!a || !b) return true;
  return a.includes(b) || b.includes(a);
}
