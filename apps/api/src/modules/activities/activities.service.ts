import { Inject, Injectable } from '@nestjs/common';
import { ActivityRecord } from './activities.types';
import { parseActivityStatus } from './parse-activity-status';
import { ACTIVITY_REPOSITORY, ActivityRepository } from './ports/activity-repository.port';

@Injectable()
export class ActivitiesService {
  constructor(
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
  ) {}

  async listActivities(userId: string, statusFilter: string | undefined): Promise<ActivityRecord[]> {
    const status = parseActivityStatus(statusFilter);
    return this.activities.findByUserAndStatus(userId, status);
  }
}
