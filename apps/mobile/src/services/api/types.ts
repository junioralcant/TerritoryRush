export type StreetOwnership = 'unclaimed' | 'mine' | 'other';

export type GeoJsonMultiLineString = {
  type: 'MultiLineString';
  coordinates: number[][][];
};

export type StreetSummary = {
  id: string;
  name: string;
  cityId: string;
  ownership: StreetOwnership;
  ownerUserId: string | null;
  geometry: GeoJsonMultiLineString;
};

export type StreetRankingEntry = {
  userId: string;
  name: string | null;
  points: number;
  rank: number;
};

export type OwnershipHistoryEntry = {
  userId: string;
  name: string | null;
  acquiredAt: string;
  lostAt: string | null;
};

export type StreetDetail = {
  id: string;
  name: string;
  cityId: string;
  owner: { userId: string; name: string | null } | null;
  disputesCount: number;
  tenureDays: number | null;
  ranking: StreetRankingEntry[];
  ownershipHistory: OwnershipHistoryEntry[];
};

export type StravaConnectionState = {
  provider: 'strava';
  connected: boolean;
  athleteId: string | null;
  scopes: string[];
  expiresAt: string | null;
};

export type Bbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};
