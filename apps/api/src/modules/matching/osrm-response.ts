import { MatchedEdge, OsrmMatchResponse } from './matching.types';

/**
 * Flattens an OSRM `/match` response (matchings → legs → steps) into matched
 * edges. Each step contributes its road name, length and a representative
 * coordinate (used later to resolve the street's city).
 */
export const toMatchedEdges = (response: OsrmMatchResponse): MatchedEdge[] => {
  const edges: MatchedEdge[] = [];
  for (const matching of response.matchings ?? []) {
    for (const leg of matching.legs) {
      for (const step of leg.steps) {
        const coordinate = step.geometry?.coordinates[0];
        if (!coordinate) {
          continue;
        }
        edges.push({
          streetName: step.name ?? '',
          lengthM: step.distance ?? 0,
          coordinate,
        });
      }
    }
  }
  return edges;
};
