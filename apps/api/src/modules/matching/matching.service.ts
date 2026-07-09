import { Inject, Injectable } from '@nestjs/common';
import { STREET_REPOSITORY, StreetRepository } from '../geo/ports/street-repository.port';
import { aggregateMatchedEdges } from './matching-aggregation';
import { MatchActivityInput, ResolvedStreet } from './matching.types';
import { ACTIVITY_STREET_REPOSITORY, ActivityStreetRepository } from './ports/activity-street-repository.port';
import { OSRM_CLIENT, OsrmClient } from './ports/osrm-client.port';

@Injectable()
export class MapMatchingService {
  constructor(
    @Inject(OSRM_CLIENT) private readonly osrm: OsrmClient,
    @Inject(STREET_REPOSITORY) private readonly streets: StreetRepository,
    @Inject(ACTIVITY_STREET_REPOSITORY) private readonly activityStreets: ActivityStreetRepository,
  ) {}

  async matchActivityStreets(input: MatchActivityInput): Promise<ResolvedStreet[]> {
    const edges = await this.osrm.match(input.trace);
    const aggregated = aggregateMatchedEdges(edges);

    const resolved: ResolvedStreet[] = [];
    for (const match of aggregated) {
      const [lng, lat] = match.coordinate;
      const cityId = await this.streets.findCityIdContaining(lng, lat);
      if (!cityId) {
        continue;
      }
      const street = await this.streets.findByNameAndCity(cityId, match.streetName);
      if (!street) {
        continue;
      }

      const visitedBefore = await this.activityStreets.hasUserVisitedStreet(
        input.userId,
        street.id,
        input.activityId,
      );
      const isFirstVisit = !visitedBefore;

      await this.activityStreets.upsert({
        activityId: input.activityId,
        streetId: street.id,
        isFirstVisit,
        matchedLengthM: match.totalLengthM,
      });

      resolved.push({
        streetId: street.id,
        streetName: street.osm_name,
        cityId,
        matchedLengthM: match.totalLengthM,
        isFirstVisit,
      });
    }
    return resolved;
  }
}
