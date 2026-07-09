import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/app-config.type';
import { IngestActivityQueue } from '../../activities/ports/ingest-activity-queue.port';
import { ProviderConnectionRepository } from './ports/provider-connection-repository.port';
import { StravaSubscriptionClient } from './ports/strava-subscription-client.port';
import { StravaWebhookEvent } from './strava.types';
import { StravaWebhookService } from './strava-webhook.service';

const VERIFY_TOKEN = 'verify-token';
const CALLBACK = 'https://api.example.com/webhooks/strava';

const config = {
  get: (key: keyof AppConfig) => (key === 'stravaWebhookVerifyToken' ? VERIFY_TOKEN : CALLBACK),
} as unknown as ConfigService<AppConfig, true>;

const makeRepo = (): jest.Mocked<ProviderConnectionRepository> => ({
  upsert: jest.fn(),
  findByUserAndProvider: jest.fn(),
  findUserIdByAthlete: jest.fn(),
  delete: jest.fn(),
});

const makeQueue = (): jest.Mocked<IngestActivityQueue> => ({
  enqueue: jest.fn().mockResolvedValue(true),
  close: jest.fn().mockResolvedValue(undefined),
});

const makeSubs = (): jest.Mocked<StravaSubscriptionClient> => ({
  listSubscriptions: jest.fn(),
  createSubscription: jest.fn(),
  deleteSubscription: jest.fn(),
});

const event = (overrides: Partial<StravaWebhookEvent> = {}): StravaWebhookEvent => ({
  objectType: 'activity',
  objectId: 555,
  aspectType: 'create',
  ownerId: 42,
  subscriptionId: 1,
  eventTime: 1_700_000_000,
  ...overrides,
});

describe('StravaWebhookService', () => {
  it('enqueues an ingest job for a new activity of a known athlete', async () => {
    const repo = makeRepo();
    const queue = makeQueue();
    repo.findUserIdByAthlete.mockResolvedValue('user-1');

    await new StravaWebhookService(config, repo, queue, makeSubs()).handleEvent(event());

    expect(repo.findUserIdByAthlete).toHaveBeenCalledWith('strava', '42');
    expect(queue.enqueue).toHaveBeenCalledWith({ userId: 'user-1', provider: 'strava', providerActivityId: '555' });
  });

  it('ignores non-create events', async () => {
    const repo = makeRepo();
    const queue = makeQueue();

    await new StravaWebhookService(config, repo, queue, makeSubs()).handleEvent(event({ aspectType: 'update' }));

    expect(repo.findUserIdByAthlete).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('ignores events from unknown athletes', async () => {
    const repo = makeRepo();
    const queue = makeQueue();
    repo.findUserIdByAthlete.mockResolvedValue(null);

    await new StravaWebhookService(config, repo, queue, makeSubs()).handleEvent(event());

    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('reuses an existing subscription and creates one only when none exists', async () => {
    const subsExisting = makeSubs();
    subsExisting.listSubscriptions.mockResolvedValue([7]);
    expect(await new StravaWebhookService(config, makeRepo(), makeQueue(), subsExisting).ensureSubscription()).toBe(7);
    expect(subsExisting.createSubscription).not.toHaveBeenCalled();

    const subsEmpty = makeSubs();
    subsEmpty.listSubscriptions.mockResolvedValue([]);
    subsEmpty.createSubscription.mockResolvedValue(99);
    expect(await new StravaWebhookService(config, makeRepo(), makeQueue(), subsEmpty).ensureSubscription()).toBe(99);
    expect(subsEmpty.createSubscription).toHaveBeenCalledWith(CALLBACK, VERIFY_TOKEN);
  });

  it('echoes the challenge using the configured verify token', () => {
    const result = new StravaWebhookService(config, makeRepo(), makeQueue(), makeSubs()).verifyChallenge({
      'hub.mode': 'subscribe',
      'hub.verify_token': VERIFY_TOKEN,
      'hub.challenge': 'echo',
    });

    expect(result).toEqual({ 'hub.challenge': 'echo' });
  });
});
