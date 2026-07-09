import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { ACHIEVEMENT_REPOSITORY } from './ports/achievement-repository.port';
import { PgAchievementRepository } from './repositories/achievement.repository';

@Module({
  imports: [AuthModule],
  controllers: [AchievementsController],
  providers: [
    AchievementsService,
    { provide: ACHIEVEMENT_REPOSITORY, useClass: PgAchievementRepository },
  ],
  exports: [AchievementsService],
})
export class AchievementsModule {}
