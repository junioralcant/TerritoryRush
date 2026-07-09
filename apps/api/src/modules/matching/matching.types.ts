export type GpsPoint = {
  lat: number;
  lng: number;
  t: number;
};

export type MatchedEdge = {
  streetName: string;
  lengthM: number;
  coordinate: [number, number];
};

export type AggregatedMatch = {
  streetName: string;
  totalLengthM: number;
  coordinate: [number, number];
};

export type MatchActivityInput = {
  activityId: string;
  userId: string;
  trace: GpsPoint[];
};

export type ResolvedStreet = {
  streetId: string;
  streetName: string;
  cityId: string;
  matchedLengthM: number;
  isFirstVisit: boolean;
};

export type UpsertActivityStreetInput = {
  activityId: string;
  streetId: string;
  isFirstVisit: boolean;
  matchedLengthM: number;
};

export type ActivityStreetRecord = {
  activityId: string;
  streetId: string;
  pointsAwarded: number;
  isFirstVisit: boolean;
  matchedLengthM: number | null;
};

export type OsrmStep = {
  name?: string;
  distance?: number;
  geometry?: { coordinates: Array<[number, number]> };
};

export type OsrmMatchResponse = {
  code: string;
  matchings?: Array<{ legs: Array<{ steps: OsrmStep[] }> }>;
};
