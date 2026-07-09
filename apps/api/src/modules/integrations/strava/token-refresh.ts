export const REFRESH_THRESHOLD_SECONDS = 600;

/**
 * A Strava access token (valid ~6h) should be refreshed proactively before it
 * expires. Returns true when the token is already expired or will expire within
 * the threshold.
 */
export const needsTokenRefresh = (
  expiresAtEpochSeconds: number,
  nowEpochSeconds: number,
  thresholdSeconds: number = REFRESH_THRESHOLD_SECONDS,
): boolean => expiresAtEpochSeconds - nowEpochSeconds <= thresholdSeconds;
