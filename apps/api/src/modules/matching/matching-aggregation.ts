import { GpsStreams } from '../activities/activities.types';
import { AggregatedMatch, GpsPoint, MatchedEdge } from './matching.types';

export const toGpsTrace = (streams: GpsStreams): GpsPoint[] =>
  streams.latlng.map(([lat, lng], index) => ({ lat, lng, t: streams.time[index] ?? index }));

/**
 * Groups matched edges by street name, summing length so repeated segments of the
 * same street in one activity collapse into a single entry. Unnamed edges (OSRM
 * returns an empty name for unnamed ways) are dropped — they cannot be attributed
 * to a named street, which is the game's territorial unit.
 */
export const aggregateMatchedEdges = (edges: MatchedEdge[]): AggregatedMatch[] => {
  const groups = new Map<string, AggregatedMatch>();

  for (const edge of edges) {
    const streetName = edge.streetName.trim();
    if (!streetName) {
      continue;
    }
    const existing = groups.get(streetName);
    if (existing) {
      existing.totalLengthM += edge.lengthM;
    } else {
      groups.set(streetName, { streetName, totalLengthM: edge.lengthM, coordinate: edge.coordinate });
    }
  }

  return [...groups.values()];
};
