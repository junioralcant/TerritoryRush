import { Inject, Injectable, Logger } from '@nestjs/common';
import { IngestActivityJob } from '../../modules/activities/activities.types';
import { ACTIVITY_REPOSITORY, ActivityRepository } from '../../modules/activities/ports/activity-repository.port';
import {
  PROVIDER_GATEWAY_REGISTRY,
  ProviderGatewayRegistry,
} from '../../modules/activities/ports/provider-gateway-registry';
import { AchievementsService } from '../../modules/achievements/achievements.service';
import { AntiCheatService } from '../../modules/anti-cheat/anti-cheat.service';
import { averageHeartrate } from '../../modules/anti-cheat/validators';
import { toGpsTrace } from '../../modules/matching/matching-aggregation';
import { MapMatchingService } from '../../modules/matching/matching.service';
import { OsrmUnmatchableTraceError } from '../../modules/matching/osrm-unmatchable-trace.error';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { RankingsService } from '../../modules/rankings/rankings.service';
import { TerritoryService } from '../../modules/territory/territory.service';
import { MetricsService } from '../../observability/metrics.service';
import { TerritoryChange } from '../../modules/territory/territory.types';
import { ResolvedStreet } from '../../modules/matching/matching.types';

const TOP_CITY_RANK = 10;

@Injectable()
export class ActivityIngestionService {
  private readonly logger = new Logger(ActivityIngestionService.name);

  constructor(
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
    @Inject(PROVIDER_GATEWAY_REGISTRY) private readonly gateways: ProviderGatewayRegistry,
    private readonly antiCheat: AntiCheatService,
    private readonly matching: MapMatchingService,
    private readonly territory: TerritoryService,
    private readonly achievements: AchievementsService,
    private readonly notifications: NotificationsService,
    private readonly rankings: RankingsService,
    private readonly metrics: MetricsService,
  ) {}

  async ingest(job: IngestActivityJob): Promise<void> {
    const activity = await this.activities.createIfAbsent(job);
    if (activity.status === 'processed') {
      return;
    }
    const gateway = this.gateways.get(job.provider);
    if (!gateway) {
      throw new Error(`No ingestion gateway for provider ${job.provider}`);
    }

    const startedAt = Date.now();
    await this.activities.updateStatus(activity.id, 'processing');
    const data = await gateway.fetchIngestData(job.userId, job.providerActivityId);
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
      this.metrics.incAntiCheatRejection();
      this.metrics.observeIngestionDuration((Date.now() - startedAt) / 1000);
      this.logger.log(`activity ${activity.id} rejected: ${verdict.reason}`);
      return;
    }

    let resolvedStreets: ResolvedStreet[];
    try {
      resolvedStreets = await this.matching.matchActivityStreets({
        activityId: activity.id,
        userId: job.userId,
        trace: toGpsTrace(data.streams),
      });
    } catch (error) {
      if (error instanceof OsrmUnmatchableTraceError) {
        await this.activities.updateStatus(activity.id, 'rejected', `Sem correspondência no mapa (${error.code})`);
        this.metrics.observeIngestionDuration((Date.now() - startedAt) / 1000);
        this.logger.log(`activity ${activity.id} rejected: unmatched trace (${error.code})`);
        return;
      }
      throw error;
    }

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
    this.metrics.incDomainChanges(changes.length);
    this.metrics.observeIngestionDuration((Date.now() - startedAt) / 1000);
    this.logger.log(
      `activity ${activity.id} processed: ${resolvedStreets.length} streets, ${changes.length} ownership changes`,
    );
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
