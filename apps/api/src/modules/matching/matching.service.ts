import { Inject, Injectable } from '@nestjs/common';
import { STREET_REPOSITORY, StreetRepository } from '../geo/ports/street-repository.port';
import { StreetRow } from '../geo/geo.types';
import { aggregateByCityAndName } from './matching-aggregation';
import { AnnotatedEdge, MatchActivityInput, MatchedEdge, ResolvedStreet } from './matching.types';

import { ACTIVITY_STREET_REPOSITORY, ActivityStreetRepository } from './ports/activity-street-repository.port';
import { OSRM_CLIENT, OsrmClient } from './ports/osrm-client.port';

const TRACE_COVERAGE_RADIUS_M = 10;
const MIN_COVERAGE_RATIO = 0.5;
const MIN_COVERAGE_FLOOR_M = 25;
const LONG_STREET_ABSOLUTE_M = 300;
const UNNAMED_SNAP_RADIUS_M = 20;

const isStreetActuallyRun = (coveredM: number, totalM: number): boolean => {
  if (coveredM >= LONG_STREET_ABSOLUTE_M) {
    return true;
  }
  return coveredM >= MIN_COVERAGE_FLOOR_M && totalM > 0 && coveredM / totalM >= MIN_COVERAGE_RATIO;
};

type StreetMatch = { street: StreetRow; matchedLengthM: number };

@Injectable()
export class MapMatchingService {
  constructor(
    @Inject(OSRM_CLIENT) private readonly osrm: OsrmClient,
    @Inject(STREET_REPOSITORY) private readonly streets: StreetRepository,
    @Inject(ACTIVITY_STREET_REPOSITORY) private readonly activityStreets: ActivityStreetRepository,
  ) {}

  async matchActivityStreets(input: MatchActivityInput): Promise<ResolvedStreet[]> {
    const edges = await this.osrm.match(input.trace);
    const byStreet = new Map<string, StreetMatch>();

    const named = edges.filter((edge) => edge.streetName.trim() !== '');
    const aggregated = aggregateByCityAndName(await this.annotateWithCity(named));
    for (const match of aggregated) {
      const street = await this.streets.findByNameAndCity(match.cityId, match.streetName);
      if (street) {
        this.addMatchedLength(byStreet, street, match.totalLengthM);
      }
    }

    const unnamed = edges.filter((edge) => edge.streetName.trim() === '');
    const nearby = await this.streets.findNearestStreets(
      unnamed.map((edge) => edge.coordinate),
      UNNAMED_SNAP_RADIUS_M,
    );
    unnamed.forEach((edge, index) => {
      const street = nearby[index];
      if (street) {
        this.addMatchedLength(byStreet, street, edge.lengthM);
      }
    });

    const confirmed = await this.confirmedByTraceCoverage([...byStreet.values()], input.trace);

    const resolved: ResolvedStreet[] = [];
    for (const { street, matchedLengthM } of confirmed) {
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
        matchedLengthM,
      });

      resolved.push({
        streetId: street.id,
        streetName: street.osm_name,
        cityId: street.city_id,
        matchedLengthM,
        isFirstVisit,
      });
    }
    return resolved;
  }

  private addMatchedLength(byStreet: Map<string, StreetMatch>, street: StreetRow, lengthM: number): void {
    const existing = byStreet.get(street.id);
    if (existing) {
      existing.matchedLengthM += lengthM;
    } else {
      byStreet.set(street.id, { street, matchedLengthM: lengthM });
    }
  }

  private async confirmedByTraceCoverage(
    candidates: StreetMatch[],
    trace: MatchActivityInput['trace'],
  ): Promise<StreetMatch[]> {
    if (candidates.length === 0) {
      return [];
    }
    const covered = await this.streets.coveredLengthByTrace(
      candidates.map((candidate) => candidate.street.id),
      trace,
      TRACE_COVERAGE_RADIUS_M,
    );
    return candidates.filter((candidate) => {
      const coverage = covered.get(candidate.street.id);
      return coverage ? isStreetActuallyRun(coverage.coveredM, coverage.totalM) : false;
    });
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
