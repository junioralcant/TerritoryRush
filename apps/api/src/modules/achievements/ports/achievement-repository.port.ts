import { AchievementCatalogEntry, RunnerAchievementView, RunnerStats } from '../achievements.types';

export const ACHIEVEMENT_REPOSITORY = Symbol('ACHIEVEMENT_REPOSITORY');

export interface AchievementRepository {
  loadRunnerStats(userId: string): Promise<RunnerStats>;
  findUnlockedCodes(userId: string): Promise<string[]>;
  unlock(userId: string, codes: string[]): Promise<void>;
  listForRunner(userId: string): Promise<RunnerAchievementView[]>;
  loadCatalog(): Promise<AchievementCatalogEntry[]>;
}
