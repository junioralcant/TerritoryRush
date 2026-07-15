import { AggregatedStreet, OsmRoadRecord } from './geo.types';

/**
 * Resolves the display/aggregation name of a road. Named roads keep their name;
 * unnamed ways get a deterministic per-way fallback so distinct physical ways
 * are never merged into a single street.
 */
export const resolveStreetName = (name: string | null, osmId: number): string => {
  const trimmed = name?.trim();
  return trimmed ? trimmed : `Via sem nome (${osmId})`;
};

/**
 * Groups OSM road records into streets keyed by (cityId, resolvedName): every
 * segment sharing a name within a city collapses into one street. Records
 * without a city or highway tag are dropped. Pure mirror of the *name-grouping*
 * half of the SQL derivation, so that rule can be unit-tested in isolation. The
 * geometric step that folds unnamed ways into a continuous named street lives in
 * `deriveStreetsFromOsmRoads` (it needs PostGIS) and is covered by integration tests.
 */
export const aggregateOsmRoads = (records: OsmRoadRecord[]): AggregatedStreet[] => {
  const groups = new Map<string, AggregatedStreet>();

  for (const record of records) {
    if (!record.cityId || !record.highway) {
      continue;
    }
    const name = resolveStreetName(record.name, record.osmId);
    const key = `${record.cityId}::${name}`;

    const existing = groups.get(key);
    if (existing) {
      existing.osmIds.push(record.osmId);
      existing.geometries.push(record.geometry);
    } else {
      groups.set(key, {
        cityId: record.cityId,
        name,
        osmIds: [record.osmId],
        geometries: [record.geometry],
      });
    }
  }

  return [...groups.values()];
};
