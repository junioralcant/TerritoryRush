import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../config/app-config.type';
import { HttpGarminActivityClient, HttpGarminOAuthClient } from './http-garmin.clients';

const config = {
  get: (key: keyof AppConfig) => (key === 'garminClientId' ? 'client-1' : 'secret-1'),
} as unknown as ConfigService<AppConfig, true>;

const jsonResponse = (body: unknown, ok = true, status = 200): Response =>
  ({ ok, status, json: async () => body }) as unknown as Response;

describe('HttpGarminOAuthClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('exchanges a PKCE code and maps the token payload', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({ access_token: 'a', refresh_token: 'r', expires_in: 3600, user_id: 'g1', scope: 'act wellness' }),
    );

    const result = await new HttpGarminOAuthClient(config).exchangeAuthorizationCode('code', 'verifier');

    expect(result).toMatchObject({ accessToken: 'a', refreshToken: 'r', userId: 'g1', scopes: ['act', 'wellness'] });
    expect(String((fetchSpy.mock.calls[0][1] as RequestInit).body)).toContain('code_verifier=verifier');
  });
});

describe('HttpGarminActivityClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('maps activity metrics with pace from average speed', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({ distanceInMeters: 5000, durationInSeconds: 1500, averageSpeedInMetersPerSecond: 4, startTimeInSeconds: 1_700_000_000 }),
    );

    const metrics = await new HttpGarminActivityClient().fetchActivity('g-1', 'token');

    expect(metrics).toMatchObject({ distanceM: 5000, movingTimeS: 1500, avgPaceSKm: 250 });
    expect(metrics.startedAt).toBe(new Date(1_700_000_000 * 1000).toISOString());
  });

  it('keeps latlng/time aligned by dropping samples without coordinates', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({
        samples: [
          { latitudeInDegree: 1, longitudeInDegree: 2, timerDurationInSeconds: 0, heartRate: 120 },
          { timerDurationInSeconds: 30, heartRate: 130 },
          { latitudeInDegree: 3, longitudeInDegree: 4, timerDurationInSeconds: 60, heartRate: 140 },
        ],
      }),
    );

    const streams = await new HttpGarminActivityClient().fetchStreams('g-1', 'token');

    expect(streams.latlng).toEqual([[1, 2], [3, 4]]);
    expect(streams.time).toEqual([0, 60]);
    expect(streams.heartrate).toEqual([120, 140]);
  });

  it('omits heartrate when not all coordinate samples carry it', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({
        samples: [
          { latitudeInDegree: 1, longitudeInDegree: 2, heartRate: 120 },
          { latitudeInDegree: 3, longitudeInDegree: 4 },
        ],
      }),
    );

    expect((await new HttpGarminActivityClient().fetchStreams('g-1', 'token')).heartrate).toBeUndefined();
  });

  it('throws on a non-ok response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({}, false, 500));

    await expect(new HttpGarminActivityClient().fetchActivity('g-1', 'token')).rejects.toThrow('status 500');
  });
});
