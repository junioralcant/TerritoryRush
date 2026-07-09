import { Inject, Injectable } from '@nestjs/common';
import { IngestActivityJob } from '../../modules/activities/activities.types';
import { ACTIVITY_REPOSITORY, ActivityRepository } from '../../modules/activities/ports/activity-repository.port';
import {
  PROVIDER_ACTIVITY_GATEWAY,
  ProviderActivityGateway,
} from '../../modules/activities/ports/provider-activity-gateway.port';
import { toGpsTrace } from '../../modules/matching/matching-aggregation';
import { MapMatchingService } from '../../modules/matching/matching.service';
import { TerritoryService } from '../../modules/territory/territory.service';

@Injectable()
export class ActivityIngestionService {
  constructor(
    @Inject(ACTIVITY_REPOSITORY) private readonly activities: ActivityRepository,
    @Inject(PROVIDER_ACTIVITY_GATEWAY) private readonly gateway: ProviderActivityGateway,
    private readonly matching: MapMatchingService,
    private readonly territory: TerritoryService,
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

    const resolvedStreets = await this.matching.matchActivityStreets({
      activityId: activity.id,
      userId: job.userId,
      trace: toGpsTrace(data.streams),
    });

    const now = new Date().toISOString();
    await this.territory.scoreAndApply({
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
  }
}
