import { StravaWebhookEvent } from './strava.types';

/**
 * Only newly created activities feed the ingestion pipeline. Updates, deletes and
 * athlete events are acknowledged (200) but not enqueued.
 */
export const isIngestibleActivityEvent = (event: StravaWebhookEvent): boolean =>
  event.objectType === 'activity' && event.aspectType === 'create';
