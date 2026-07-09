import { GarminWebhookActivity, GarminWebhookPayload } from './garmin.types';

/**
 * Extracts the valid activity entries from a Garmin push payload — those with both
 * a Garmin userId and a summary id. Pure and provider-shaped.
 */
export const extractGarminActivities = (payload: GarminWebhookPayload): GarminWebhookActivity[] =>
  (payload.activities ?? []).filter((activity) => Boolean(activity.userId) && Boolean(activity.summaryId));
