import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { ActivitiesService } from './activities.service';
import { ActivityRecord } from './activities.types';

@Controller('activities')
@UseGuards(SupabaseJwtGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  listActivities(
    @CurrentUser() user: AuthUser,
    @Query('status') status: string | undefined,
  ): Promise<ActivityRecord[]> {
    return this.activitiesService.listActivities(user.id, status);
  }
}
