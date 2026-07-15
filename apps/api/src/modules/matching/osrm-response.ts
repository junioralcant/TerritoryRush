import { MatchedEdge, OsrmMatchResponse } from './matching.types';

/**
 * Flattens an OSRM `/match` response (matchings → legs → steps) into matched
 * edges. Each step contributes its road name, length and a representative
 * coordinate — the step's midpoint, used later to resolve the street (by city
 * for named edges, by nearest geometry for unnamed ones). The midpoint keeps the
 * point away from intersections, where a start coordinate would be ambiguous.
 */
export const toMatchedEdges = (response: OsrmMatchResponse): MatchedEdge[] => {
  const edges: MatchedEdge[] = [];
  for (const matching of response.matchings ?? []) {
    for (const leg of matching.legs) {
      for (const step of leg.steps) {
        const coordinates = step.geometry?.coordinates ?? [];
        const coordinate = coordinates[Math.floor(coordinates.length / 2)];
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
