export type RunnerProfile = {
  id: string;
  userId: string;
  name: string | null;
  city: string | null;
  photoUrl: string | null;
  totalDistanceM: number;
  streakDays: number;
  lastActiveOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateRunnerProfileInput = {
  userId: string;
  name?: string | null;
};

export type RunnerProfileAggregates = {
  totalPoints: number;
  streetsOwned: number;
  streetsExplored: number;
  cityRank: number | null;
  nationalRank: number;
};

export type RunnerProfileDetail = RunnerProfile & RunnerProfileAggregates;

export type RunnerProfileRow = {
  id: string;
  user_id: string;
  name: string | null;
  city: string | null;
  photo_url: string | null;
  total_distance_m: string;
  streak_days: number;
  last_active_on: Date | null;
  created_at: Date;
  updated_at: Date;
};
