import { RunnerStats } from './achievements.types';

type AchievementRule = {
  code: string;
  isSatisfied: (stats: RunnerStats) => boolean;
};

const RULES: readonly AchievementRule[] = [
  { code: 'first_run', isSatisfied: (s) => s.activityCount >= 1 },
  { code: 'first_street', isSatisfied: (s) => s.streetsOwned >= 1 },
  { code: 'streets_10', isSatisfied: (s) => s.streetsOwned >= 10 },
  { code: 'streets_50', isSatisfied: (s) => s.streetsOwned >= 50 },
  { code: 'streets_100', isSatisfied: (s) => s.streetsOwned >= 100 },
  { code: 'streets_500', isSatisfied: (s) => s.streetsOwned >= 500 },
  { code: 'streets_1000', isSatisfied: (s) => s.streetsOwned >= 1000 },
  { code: 'km_100', isSatisfied: (s) => s.totalDistanceKm >= 100 },
  { code: 'km_500', isSatisfied: (s) => s.totalDistanceKm >= 500 },
  { code: 'km_1000', isSatisfied: (s) => s.totalDistanceKm >= 1000 },
  { code: 'first_city', isSatisfied: (s) => s.citiesExplored >= 1 },
];

/**
 * Returns the achievement codes newly unlocked by the runner's current stats —
 * those whose threshold is met and that are not already unlocked. Pure and
 * deterministic; unlocking a milestone once is guaranteed by excluding
 * already-unlocked codes.
 */
export const evaluateAchievements = (stats: RunnerStats, alreadyUnlocked: string[]): string[] => {
  const unlocked = new Set(alreadyUnlocked);
  return RULES.filter((rule) => !unlocked.has(rule.code) && rule.isSatisfied(stats)).map(
    (rule) => rule.code,
  );
};
