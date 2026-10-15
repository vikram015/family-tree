/**
 * A person's career profile as returned by `ApiService.getProfessionProfile`,
 * or null when there is none to show.
 *
 * The endpoint also answers with a placeholder (`hasProfile: false`) for a
 * profile this viewer may not see, so the profession page can say "shared with
 * family only". It has no title or details, so cards and summaries treat it as
 * no profile.
 */
export function readableProfessionProfile<T extends { hasProfile?: boolean } | null | undefined>(
  profile: T,
): T | null {
  return profile && profile.hasProfile !== false ? profile : null;
}
