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
