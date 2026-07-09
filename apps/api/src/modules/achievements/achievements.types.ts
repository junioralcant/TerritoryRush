export type RunnerStats = {
  activityCount: number;
  streetsOwned: number;
  totalDistanceKm: number;
  citiesExplored: number;
};

export type AchievementCatalogEntry = {
  code: string;
  title: string;
  category: string;
  threshold: number;
};

export type RunnerAchievementView = AchievementCatalogEntry & {
  unlocked: boolean;
  unlockedAt: string | null;
};
