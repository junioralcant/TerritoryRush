const FOOT_SPORTS = new Set(['run', 'trailrun', 'walk', 'hike']);

const normalize = (value: string): string => value.replace(/[\s_-]/g, '').toLowerCase();

/**
 * Whether an activity should feed territory and the activities feed based on its
 * sport type. Only on-foot sports (corrida, caminhada, trilha a pé) are kept;
 * anything else (bike, swim, …) is discarded. An unknown/absent sport type is
 * allowed so providers that don't report one (e.g. Garmin) are not silently
 * dropped — Strava always sends `sport_type`, so its non-foot activities are
 * still filtered out.
 */
export const isAllowedSport = (sportType: string | null | undefined): boolean => {
  if (sportType == null || sportType === '') {
    return true;
  }
  return FOOT_SPORTS.has(normalize(sportType));
};
