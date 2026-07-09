import { Inject, Injectable, Logger } from '@nestjs/common';
import { IngestActivityJob } from '../../modules/activities/activities.types';
import { ACTIVITY_REPOSITORY, ActivityRepository } from '../../modules/activities/ports/activity-repository.port';
import {
  PROVIDER_ACTIVITY_GATEWAY,
  ProviderActivityGateway,
} from '../../modules/activities/ports/provider-activity-gateway.port';
import { AchievementsService } from '../../modules/achievements/achievements.service';
import { AntiCheatService } from '../../modules/anti-cheat/anti-cheat.service';
import { averageHeartrate } from '../../modules/anti-cheat/validators';
import { toGpsTrace } from '../../modules/matching/matching-aggregation';
import { MapMatchingService } from '../../modules/matching/matching.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { RankingsService } from '../../modules/rankings/rankings.service';
import { TerritoryService } from '../../modules/territory/territory.service';
import { TerritoryChange } from '../../modules/territory/territory.types';
import { ResolvedStreet } from '../../modules/matching/matching.types';

const TOP_CITY_RANK = 10;

@Injectable()
export class ActivityIngestionService {
  private readonly logger = new Logger(ActivityIngestionService.name);

  constructor(
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
    @Inject(PROVIDER_ACTIVITY_GATEWAY) private readonly gateway: ProviderActivityGateway,
    private readonly antiCheat: AntiCheatService,
    private readonly matching: MapMatchingService,
    private readonly territory: TerritoryService,
    private readonly achievements: AchievementsService,
    private readonly notifications: NotificationsService,
    private readonly rankings: RankingsService,
  ) {}

  async ingest(job: IngestActivityJob): Promise<void> {
    const activity = await this.activities.createIfAbsent(job);
    if (activity.status === 'processed') {
      return;
    }
    if (this.gateway.provider !== job.provider) {
      throw new Error(`No ingestion gateway for provider ${job.provider}`);
    }

    await this.activities.updateStatus(activity.id, 'processing');
    const data = await this.gateway.fetchIngestData(job.userId, job.providerActivityId);
    await this.activities.saveIngestedData(activity.id, data);

    const verdict = this.antiCheat.evaluate({
      provider: job.provider,
      distanceM: data.metrics.distanceM,
      movingTimeS: data.metrics.movingTimeS,
      avgPaceSKm: data.metrics.avgPaceSKm,
      avgHeartrate: averageHeartrate(data.streams),
    });
    if (!verdict.approved) {
      await this.activities.updateStatus(activity.id, 'rejected', verdict.reason);
      return;
    }

    const resolvedStreets = await this.matching.matchActivityStreets({
      activityId: activity.id,
      userId: job.userId,
      trace: toGpsTrace(data.streams),
    });

    const now = new Date().toISOString();
    const changes = await this.territory.scoreAndApply({
      activityId: activity.id,
      userId: job.userId,
      activityDate: data.metrics.startedAt ?? now,
      now,
      streets: resolvedStreets.map((street) => ({
        streetId: street.streetId,
        cityId: street.cityId,
        isFirstVisit: street.isFirstVisit,
      })),
    });

    await this.activities.updateStatus(activity.id, 'processed');
    await this.dispatchEngagement(job.userId, changes, resolvedStreets);
  }

  private async dispatchEngagement(
    userId: string,
    changes: TerritoryChange[],
    resolvedStreets: ResolvedStreet[],
  ): Promise<void> {
    try {
      for (const change of changes) {
        await this.notifications.notify(change.newOwnerId, 'street_captured', {
          streetId: change.streetId,
        });
        if (change.previousOwnerId) {
          await this.notifications.notify(change.previousOwnerId, 'street_lost', {
            streetId: change.streetId,
          });
        }
      }

      const unlocked = await this.achievements.unlockForRunner(userId);
      for (const code of unlocked) {
        await this.notifications.notify(userId, 'achievement_unlocked', { code });
      }

      const cityIds = [...new Set(resolvedStreets.map((street) => street.cityId))];
      for (const cityId of cityIds) {
        const rank = await this.rankings.getUserCityRank(userId, cityId);
        if (rank !== null && rank <= TOP_CITY_RANK) {
          await this.notifications.notifyCityOnce(userId, 'top10_city', cityId, { cityId, rank });
        }
      }
    } catch (error) {
      this.logger.warn(`Engagement dispatch failed for user ${userId}: ${(error as Error).message}`);
    }
  }
}
