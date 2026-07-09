export type StreakResult = {
  streakDays: number;
  lastActiveOn: string;
};

const toDate = (iso: string): string => iso.slice(0, 10);

const daysBetween = (fromIso: string, toIso: string): number => {
  const from = Date.parse(`${toDate(fromIso)}T00:00:00Z`);
  const to = Date.parse(`${toDate(toIso)}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
};

/**
 * Computes the runner's consecutive-day streak after an activity. Same day keeps
 * the streak; the next day increments it; a gap (or an out-of-order/older date)
 * resets it to 1.
 */
export const computeStreak = (
  lastActiveOn: string | null,
  activityDate: string,
  currentStreak: number,
): StreakResult => {
  if (!lastActiveOn) {
    return { streakDays: 1, lastActiveOn: toDate(activityDate) };
  }
  const gap = daysBetween(lastActiveOn, activityDate);
  if (gap === 0) {
    return { streakDays: Math.max(currentStreak, 1), lastActiveOn: toDate(activityDate) };
  }
  if (gap === 1) {
    return { streakDays: currentStreak + 1, lastActiveOn: toDate(activityDate) };
  }
  if (gap < 0) {
    return { streakDays: currentStreak, lastActiveOn: toDate(lastActiveOn) };
  }
  return { streakDays: 1, lastActiveOn: toDate(activityDate) };
};
