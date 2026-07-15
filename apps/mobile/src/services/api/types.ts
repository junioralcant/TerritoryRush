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

export type StravaSyncResult = {
  enqueued: number;
};

export type Bbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type RunnerProfileDetail = {
  id: string;
  userId: string;
  name: string | null;
  city: string | null;
  photoUrl: string | null;
  totalDistanceM: number;
  streakDays: number;
  totalPoints: number;
  streetsOwned: number;
  streetsExplored: number;
  cityId: string | null;
  cityRank: number | null;
  nationalRank: number;
};

export type CityRankingEntry = {
  userId: string;
  name: string | null;
  rank: number;
  streetsOwned: number;
};

export type ExplorerRankingEntry = {
  userId: string;
  name: string | null;
  rank: number;
  streetsVisited: number;
};

export type AchievementView = {
  code: string;
  title: string;
  category: string;
  threshold: number;
  unlocked: boolean;
  unlockedAt: string | null;
};

export type NotificationItem = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
};

export type ActivityStatus = 'imported' | 'processing' | 'processed' | 'rejected';

export type Activity = {
  id: string;
  provider: 'strava' | 'garmin';
  providerActivityId: string;
  status: ActivityStatus;
  distanceM: number | null;
  movingTimeS: number | null;
  avgPaceSKm: number | null;
  startedAt: string | null;
  rejectionReason: string | null;
};
