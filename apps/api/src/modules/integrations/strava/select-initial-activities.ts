import { StravaActivitySummary } from './strava.types';

/**
 * Picks which listed Strava activities to import for a runner, given when they
 * signed up: every activity started on/after signup (new runs), plus the
 * `seedCount` most recent activities started before signup (the initial seed).
 * Older pre-signup runs are ignored — the runner starts with just that seed and
 * whatever they conquer next. Activities without a start date are dropped.
 */
export const selectInitialActivities = (
  activities: StravaActivitySummary[],
  signedUpAtMs: number,
  seedCount: number,
): StravaActivitySummary[] => {
  const dated = activities.filter((activity) => activity.startedAt !== null);
  const afterSignup = dated.filter((activity) => Date.parse(activity.startedAt as string) >= signedUpAtMs);
  const seedBeforeSignup = dated
    .filter((activity) => Date.parse(activity.startedAt as string) < signedUpAtMs)
    .sort((a, b) => Date.parse(b.startedAt as string) - Date.parse(a.startedAt as string))
    .slice(0, seedCount);
  return [...afterSignup, ...seedBeforeSignup];
};
