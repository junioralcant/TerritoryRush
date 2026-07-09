import { GpsStreams } from '../activities/activities.types';
import { AggregatedMatch, AnnotatedEdge, GpsPoint } from './matching.types';

export const toGpsTrace = (streams: GpsStreams): GpsPoint[] =>
  streams.latlng.map(([lat, lng], index) => ({ lat, lng, t: streams.time[index] ?? index }));

/**
 * Groups edges (already annotated with their city) by (city, street name), summing
 * length so repeated segments of the same street collapse into one entry while a
 * homonymous street in another city stays separate. Unnamed edges (OSRM returns an
 * empty name for unnamed ways) are dropped — they cannot be attributed to a named
 * street, which is the game's territorial unit.
 */
export const aggregateByCityAndName = (edges: AnnotatedEdge[]): AggregatedMatch[] => {
  const groups = new Map<string, AggregatedMatch>();

  for (const edge of edges) {
    const streetName = edge.streetName.trim();
    if (!streetName) {
      continue;
    }
    const key = `${edge.cityId}::${streetName}`;
    const existing = groups.get(key);
    if (existing) {
      existing.totalLengthM += edge.lengthM;
    } else {
      groups.set(key, { cityId: edge.cityId, streetName, totalLengthM: edge.lengthM });
    }
  }

  return [...groups.values()];
};
