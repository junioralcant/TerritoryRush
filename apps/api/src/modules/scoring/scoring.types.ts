export type StreetScoringContext = {
  streetId: string;
  isFirstVisit: boolean;
  ownershipDays: number | null;
  defenseTierAwarded: number;
};

export type ScoringInput = {
  streets: StreetScoringContext[];
  newNeighborhoods: number;
  streakDays: number;
  streakBonusAwardedTier: number;
};

export type StreetAward = {
  streetId: string;
  isFirstVisit: boolean;
  explorationPoints: number;
  defensePoints: number;
  newDefenseTier: number;
};

export type ScoringResult = {
  streetAwards: StreetAward[];
  regionPoints: number;
  consistencyPoints: number;
  newStreakTier: number;
  totalPoints: number;
};
