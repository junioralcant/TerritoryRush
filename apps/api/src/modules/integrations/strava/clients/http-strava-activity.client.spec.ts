import { HttpStravaActivityClient } from './http-strava-activity.client';

const jsonResponse = (
  body: unknown,
  init: { ok?: boolean; status?: number; retryAfter?: string } = {},
): Response =>
  ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers: { get: (name: string) => (name.toLowerCase() === 'retry-after' ? init.retryAfter ?? null : null) },
    json: async () => body,
  }) as unknown as Response;

describe('HttpStravaActivityClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('maps activity metrics, taking pace from the independent average_speed', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({ distance: 5000, moving_time: 1500, average_speed: 4, start_date: '2026-07-09T10:00:00Z' }),
    );

    const metrics = await new HttpStravaActivityClient().fetchActivity('555', 'token');

    expect(metrics).toEqual({
      distanceM: 5000,
      movingTimeS: 1500,
      avgPaceSKm: 250,
      startedAt: '2026-07-09T10:00:00Z',
    });
  });

  it('derives pace from distance/time when average_speed is absent', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({ distance: 5000, moving_time: 1500, start_date: '2026-07-09T10:00:00Z' }),
    );

    expect((await new HttpStravaActivityClient().fetchActivity('555', 'token')).avgPaceSKm).toBe(300);
  });

  it('returns a null pace when distance is missing or zero', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ moving_time: 1500 }));

    expect((await new HttpStravaActivityClient().fetchActivity('555', 'token')).avgPaceSKm).toBeNull();
  });

  it('maps the key-by-type stream set, defaulting missing streams', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({ latlng: { data: [[1, 2], [3, 4]] }, time: { data: [0, 60] } }),
    );

    const streams = await new HttpStravaActivityClient().fetchStreams('555', 'token');

    expect(streams).toEqual({ latlng: [[1, 2], [3, 4]], time: [0, 60], heartrate: undefined });
  });

  it('throws a rate-limit error surfacing retry-after on 429', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({}, { ok: false, status: 429, retryAfter: '60' }));

    await expect(new HttpStravaActivityClient().fetchStreams('555', 'token')).rejects.toThrow(
      'rate limited (retry-after=60)',
    );
  });

  it('throws on a generic non-ok status', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({}, { ok: false, status: 404 }));

    await expect(new HttpStravaActivityClient().fetchActivity('555', 'token')).rejects.toThrow('status 404');
  });
});
