import { Bbox, StreetRow } from '../geo.types';

export const STREET_REPOSITORY = Symbol('STREET_REPOSITORY');

/**
 * Persistence contract for the territorial road network. Query methods read the
 * derived `public.street` table; the derivation methods build it from the OSM
 * staging table (`geo.osm_road`) populated by the import pipeline.
 */
export interface StreetRepository {
  findInBbox(bbox: Bbox, limit: number): Promise<StreetRow[]>;
  findByNameAndCity(cityId: string, name: string): Promise<StreetRow | null>;
  resolveCitiesForOsmRoads(): Promise<number>;
  deriveStreetsFromOsmRoads(): Promise<number>;
}
