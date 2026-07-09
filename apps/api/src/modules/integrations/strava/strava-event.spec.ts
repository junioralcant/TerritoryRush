import { StravaWebhookEvent } from './strava.types';
import { isIngestibleActivityEvent } from './strava-event';

const event = (overrides: Partial<StravaWebhookEvent> = {}): StravaWebhookEvent => ({
  objectType: 'activity',
  objectId: 123,
  aspectType: 'create',
  ownerId: 999,
  subscriptionId: 1,
  eventTime: 1_700_000_000,
  ...overrides,
});

describe('isIngestibleActivityEvent', () => {
  it('accepts a newly created activity', () => {
    expect(isIngestibleActivityEvent(event())).toBe(true);
  });

  it('rejects activity updates and deletes', () => {
    expect(isIngestibleActivityEvent(event({ aspectType: 'update' }))).toBe(false);
    expect(isIngestibleActivityEvent(event({ aspectType: 'delete' }))).toBe(false);
  });

  it('rejects non-activity objects', () => {
    expect(isIngestibleActivityEvent(event({ objectType: 'athlete' }))).toBe(false);
  });
});
