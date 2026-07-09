export const MILESTONE_DAYS: readonly [number, number, number] = [7, 30, 90];

/**
 * Maps a duration in days to a milestone tier: 0 (<7d), 1 (>=7d), 2 (>=30d),
 * 3 (>=90d). Shared by the streak (consistency) and defense rules.
 */
export const tierForDays = (days: number): number =>
  MILESTONE_DAYS.reduce((tier, threshold) => (days >= threshold ? tier + 1 : tier), 0);

/**
 * Sums the milestone points earned when crossing from an already-awarded tier up
 * to a newly reached tier, so each milestone is awarded exactly once.
 */
export const milestonePointsBetween = (
  fromTier: number,
  toTier: number,
  pointsByTier: Readonly<Record<number, number>>,
): number => {
  let total = 0;
  for (let tier = fromTier + 1; tier <= toTier; tier += 1) {
    total += pointsByTier[tier] ?? 0;
  }
  return total;
};
