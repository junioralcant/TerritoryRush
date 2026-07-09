import { Inject, Injectable } from '@nestjs/common';
import { evaluateAchievements } from './achievement-rules';
import { RunnerAchievementView } from './achievements.types';
import { ACHIEVEMENT_REPOSITORY, AchievementRepository } from './ports/achievement-repository.port';

@Injectable()
export class AchievementsService {
  constructor(
    @Inject(ACHIEVEMENT_REPOSITORY) private readonly achievements: AchievementRepository,
  ) {}

  async unlockForRunner(userId: string): Promise<string[]> {
    const [stats, unlocked] = await Promise.all([
      this.achievements.loadRunnerStats(userId),
      this.achievements.findUnlockedCodes(userId),
    ]);
    const newlyUnlocked = evaluateAchievements(stats, unlocked);
    await this.achievements.unlock(userId, newlyUnlocked);
    return newlyUnlocked;
  }

  listAchievements(userId: string): Promise<RunnerAchievementView[]> {
    return this.achievements.listForRunner(userId);
  }
}
