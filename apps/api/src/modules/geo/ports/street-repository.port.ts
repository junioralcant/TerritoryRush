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
  findCityIdContaining(lng: number, lat: number): Promise<string | null>;
  /**
   * For each street id, the length (m) of its geometry lying within `radiusMeters`
   * of the raw GPS trace. Used to reject OSRM over-matches — streets the runner did
   * not actually cover. Streets absent from the result cover zero.
   */
  coveredLengthByTrace(
    streetIds: string[],
    trace: Array<{ lat: number; lng: number }>,
    radiusMeters: number,
  ): Promise<Map<string, number>>;
  /**
   * For each `[lng, lat]` point, the nearest street within `maxMeters` (or null).
   * Resolves matched edges to a street by geometry, so segments the runner ran
   * that OSM left unnamed are still attributed instead of dropped.
   */
  findNearestStreets(points: Array<[number, number]>, maxMeters: number): Promise<Array<StreetRow | null>>;
  resolveCitiesForOsmRoads(): Promise<number>;
  /**
   * Rebuilds `public.street` from `geo.osm_road`: every segment sharing a name within
   * a city collapses into one street. An unnamed way is first folded into the named
   * street it *continues* — endpoints share an OSM node and the two segments leave it
   * near a straight line — so a physical street OSM split (and partly left unnamed)
   * stays a single territorial unit. The absorption follows chains of unnamed ways and
   * ignores branches; it is bounded by a cumulative length cap so a straight rural
   * highway cannot be swallowed across municipalities into one street. Unnamed ways with
   * no straight named continuation (or beyond the cap) keep a deterministic per-way
   * fallback label. Finally each street's geometry is clipped to its city boundary, so a
   * road merely passing through the city contributes only its in-city portion (no street
   * spanning from one city into another).
   */
  deriveStreetsFromOsmRoads(): Promise<number>;
  /**
   * Wipes the derived street network so it can be rebuilt from scratch. Because
   * every gameplay table (`activity_street`, `street_score`,
   * `street_ownership_history`) references `public.street` with ON DELETE CASCADE,
   * this also clears all territory/ownership/scoring rows — a full reset, not a
   * geometry refresh. The ranking materialized views are left stale for the caller
   * to refresh.
   */
  clearDerivedStreets(): Promise<void>;
}
