/**
 * Two-letter initials from a runner name (e.g. "Junior Lima" → "JL"), used for
 * avatar fallbacks and ranking rows. Returns "?" when the name is missing.
 */
export const initials = (name?: string | null): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
};
