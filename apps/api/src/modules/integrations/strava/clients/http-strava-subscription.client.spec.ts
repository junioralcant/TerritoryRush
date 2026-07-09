import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../config/app-config.type';
import { HttpStravaSubscriptionClient } from './http-strava-subscription.client';

const config = {
  get: (key: keyof AppConfig) => (key === 'stravaClientId' ? 'client-1' : 'secret-1'),
} as unknown as ConfigService<AppConfig, true>;

const jsonResponse = (body: unknown, ok = true, status = 200): Response =>
  ({ ok, status, json: async () => body }) as unknown as Response;

describe('HttpStravaSubscriptionClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('lists subscription ids', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse([{ id: 7 }, { id: 8 }]));

    expect(await new HttpStravaSubscriptionClient(config).listSubscriptions()).toEqual([7, 8]);
  });

  it('creates a subscription with callback and verify token', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ id: 55 }));

    const id = await new HttpStravaSubscriptionClient(config).createSubscription('https://cb', 'vt');

    expect(id).toBe(55);
    const [, init] = fetchSpy.mock.calls[0];
    const body = String((init as RequestInit).body);
    expect(body).toContain('callback_url=https');
    expect(body).toContain('verify_token=vt');
  });

  it('deletes a subscription', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({}, true, 204));

    await new HttpStravaSubscriptionClient(config).deleteSubscription(55);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/push_subscriptions/55');
    expect((init as RequestInit).method).toBe('DELETE');
  });

  it('throws on a non-ok response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({}, false, 500));

    await expect(new HttpStravaSubscriptionClient(config).listSubscriptions()).rejects.toThrow('status 500');
  });
});
