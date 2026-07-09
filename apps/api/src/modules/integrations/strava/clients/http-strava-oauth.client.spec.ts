import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../config/app-config.type';
import { HttpStravaOAuthClient } from './http-strava-oauth.client';

const config = {
  get: (key: keyof AppConfig) => (key === 'stravaClientId' ? 'client-1' : 'secret-1'),
} as unknown as ConfigService<AppConfig, true>;

const jsonResponse = (body: unknown, ok = true, status = 200): Response =>
  ({ ok, status, json: async () => body }) as unknown as Response;

describe('HttpStravaOAuthClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('exchanges an authorization code and maps the token payload', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({
        access_token: 'a-token',
        refresh_token: 'r-token',
        expires_at: 1_700_000_000,
        athlete: { id: 42 },
        scope: 'read,activity:read',
      }),
    );

    const result = await new HttpStravaOAuthClient(config).exchangeAuthorizationCode('the-code');

    expect(result).toEqual({
      accessToken: 'a-token',
      refreshToken: 'r-token',
      expiresAt: 1_700_000_000,
      athleteId: '42',
      scopes: ['read', 'activity:read'],
    });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://www.strava.com/oauth/token');
    expect(String((init as RequestInit).body)).toContain('grant_type=authorization_code');
    expect(String((init as RequestInit).body)).toContain('code=the-code');
  });

  it('maps an empty scope/athlete to safe defaults', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({ access_token: 'a', refresh_token: 'r', expires_at: 1 }),
    );

    const result = await new HttpStravaOAuthClient(config).refreshAccessToken('r-token');

    expect(result.athleteId).toBe('');
    expect(result.scopes).toEqual([]);
  });

  it('throws when Strava responds with a non-ok status', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({}, false, 400));

    await expect(new HttpStravaOAuthClient(config).exchangeAuthorizationCode('bad')).rejects.toThrow('status 400');
  });
});
