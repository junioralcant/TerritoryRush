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
