import { HttpStravaActivityClient } from './http-strava-activity.client';
import { MetricsService } from '../../../../observability/metrics.service';

const metrics = { incStravaRateLimitHit: jest.fn() } as unknown as MetricsService;
const makeClient = (): HttpStravaActivityClient => new HttpStravaActivityClient(metrics);

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
      jsonResponse({
        distance: 5000,
        moving_time: 1500,
        average_speed: 4,
        start_date: '2026-07-09T10:00:00Z',
        sport_type: 'Run',
      }),
    );

    const metrics = await makeClient().fetchActivity('555', 'token');

    expect(metrics).toEqual({
      distanceM: 5000,
      movingTimeS: 1500,
      avgPaceSKm: 250,
      startedAt: '2026-07-09T10:00:00Z',
      sportType: 'Run',
    });
  });

  it('derives pace from distance/time when average_speed is absent', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({ distance: 5000, moving_time: 1500, start_date: '2026-07-09T10:00:00Z' }),
    );

    expect((await makeClient().fetchActivity('555', 'token')).avgPaceSKm).toBe(300);
  });

  it('returns a null pace when distance is missing or zero', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ moving_time: 1500 }));

    expect((await makeClient().fetchActivity('555', 'token')).avgPaceSKm).toBeNull();
  });

  it('maps the key-by-type stream set, defaulting missing streams', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({ latlng: { data: [[1, 2], [3, 4]] }, time: { data: [0, 60] } }),
    );

    const streams = await makeClient().fetchStreams('555', 'token');

    expect(streams).toEqual({ latlng: [[1, 2], [3, 4]], time: [0, 60], heartrate: undefined });
  });

  it('throws a rate-limit error surfacing retry-after on 429', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({}, { ok: false, status: 429, retryAfter: '60' }));

    await expect(makeClient().fetchStreams('555', 'token')).rejects.toThrow(
      'rate limited (retry-after=60)',
    );
  });

  it('throws on a generic non-ok status', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({}, { ok: false, status: 404 }));

    await expect(makeClient().fetchActivity('555', 'token')).rejects.toThrow('status 404');
  });

  it('lists recent activities with sport type and start date, requesting the given per_page and dropping entries without an id', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        jsonResponse([
          { id: 555, sport_type: 'Run', start_date: '2026-07-09T10:00:00Z' },
          { id: 556, type: 'Ride' },
          { name: 'no id' },
        ]),
      );

    const activities = await makeClient().listRecentActivities('token', 30);

    expect(activities).toEqual([
      { providerActivityId: '555', sportType: 'Run', startedAt: '2026-07-09T10:00:00Z' },
      { providerActivityId: '556', sportType: 'Ride', startedAt: null },
    ]);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://www.strava.com/api/v3/athlete/activities?per_page=30',
      { headers: { Authorization: 'Bearer token' } },
    );
  });

  it('throws a rate-limit error when listing is throttled', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({}, { ok: false, status: 429, retryAfter: '30' }));

    await expect(makeClient().listRecentActivities('token', 30)).rejects.toThrow('rate limited (retry-after=30)');
  });
});
