import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { AchievementsService } from './achievements.service';
import { RunnerAchievementView } from './achievements.types';

@Controller('me')
@UseGuards(SupabaseJwtGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get('achievements')
  getAchievements(@CurrentUser() user: AuthUser): Promise<RunnerAchievementView[]> {
    return this.achievementsService.listAchievements(user.id);
  }
}
