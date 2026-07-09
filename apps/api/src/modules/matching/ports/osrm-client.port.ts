import { GpsPoint, MatchedEdge } from '../matching.types';

export const OSRM_CLIENT = Symbol('OSRM_CLIENT');

/**
 * Contract for the OSRM `/match` service (external, self-hosted). Given a GPS
 * trace it returns the matched road edges (name + length). Mocked at this boundary
 * in tests — a real OSRM needs a processed OSM extract (see infra/osrm).
 */
export interface OsrmClient {
  match(trace: GpsPoint[]): Promise<MatchedEdge[]>;
}
