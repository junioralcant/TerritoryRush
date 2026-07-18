export type Bbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type GeoJsonMultiLineString = {
  type: 'MultiLineString';
  coordinates: number[][][];
};

export type StreetOwnership = 'unclaimed' | 'mine' | 'other';

export type StreetSummary = {
  id: string;
  name: string;
  cityId: string;
  ownership: StreetOwnership;
  ownerUserId: string | null;
  geometry: GeoJsonMultiLineString;
};

export type OsmRoadRecord = {
  osmId: number;
  name: string | null;
  highway: string | null;
  cityId: string | null;
  geometry: string;
};

export type AggregatedStreet = {
  cityId: string;
  name: string;
  osmIds: number[];
  geometries: string[];
};

export type StreetRow = {
  id: string;
  osm_name: string;
  city_id: string;
  owner_user_id: string | null;
  geojson: string;
};

export type TraceCoverage = {
  coveredM: number;
  totalM: number;
};
