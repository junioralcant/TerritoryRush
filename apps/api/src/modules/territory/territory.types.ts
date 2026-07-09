export type MatchedStreetInput = {
  streetId: string;
  cityId: string;
  isFirstVisit: boolean;
};

export type ScoreActivityInput = {
  activityId: string;
  userId: string;
  activityDate: string;
  now: string;
  streets: MatchedStreetInput[];
};

export type TerritoryChange = {
  streetId: string;
  previousOwnerId: string | null;
  newOwnerId: string;
};

export type StreetOwnerSummary = {
  userId: string;
  name: string | null;
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
  owner: StreetOwnerSummary | null;
  disputesCount: number;
  tenureDays: number | null;
  ranking: StreetRankingEntry[];
  ownershipHistory: OwnershipHistoryEntry[];
};
