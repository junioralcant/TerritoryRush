export const computeTenureDays = (defendedSince: string | null, nowIso: string): number | null => {
  if (!defendedSince) {
    return null;
  }
  const days = Math.floor((Date.parse(nowIso) - Date.parse(defendedSince)) / 86_400_000);
  return days < 0 ? 0 : days;
};
