import { Inject, Injectable } from '@nestjs/common';
import { STREET_REPOSITORY, StreetRepository } from '../geo/ports/street-repository.port';
import { aggregateByCityAndName } from './matching-aggregation';
import { AnnotatedEdge, MatchActivityInput, MatchedEdge, ResolvedStreet } from './matching.types';

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
    const annotated = await this.annotateWithCity(edges);
    const aggregated = aggregateByCityAndName(annotated);

    const resolved: ResolvedStreet[] = [];
    for (const match of aggregated) {
      const street = await this.streets.findByNameAndCity(match.cityId, match.streetName);
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
        cityId: match.cityId,
        matchedLengthM: match.totalLengthM,
        isFirstVisit,
      });
    }
    return resolved;
  }

  private async annotateWithCity(edges: MatchedEdge[]): Promise<AnnotatedEdge[]> {
    const cityByCoordinate = new Map<string, string | null>();
    const annotated: AnnotatedEdge[] = [];

    for (const edge of edges) {
      const [lng, lat] = edge.coordinate;
      const key = `${lng},${lat}`;
      let cityId = cityByCoordinate.get(key);
      if (cityId === undefined) {
        cityId = await this.streets.findCityIdContaining(lng, lat);
        cityByCoordinate.set(key, cityId);
      }
      if (!cityId) {
        continue;
      }
      annotated.push({ cityId, streetName: edge.streetName, lengthM: edge.lengthM });
    }
    return annotated;
  }
}
