import { createHttpApiClient } from './http-api-client';

const jsonResponse = (body: unknown, ok = true, status = 200): Response =>
  ({ ok, status, json: async () => body }) as unknown as Response;

const getToken = async () => 'jwt-token';

describe('createHttpApiClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('gets streets by bbox with the auth header', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse([{ id: 's1' }]));

    const streets = await createHttpApiClient('http://api', getToken).getStreets({
      minLng: -1,
      minLat: -2,
      maxLng: 3,
      maxLat: 4,
    });

    expect(streets).toEqual([{ id: 's1' }]);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://api/streets?bbox=-1,-2,3,4');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer jwt-token' });
  });

  it('connects Strava by posting the code', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ connected: true }));

    await createHttpApiClient('http://api', getToken).connectStrava('auth-code');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://api/integrations/strava/connect');
    expect((init as RequestInit).method).toBe('POST');
    expect(String((init as RequestInit).body)).toContain('auth-code');
  });

  it('disconnects Strava with DELETE and handles 204', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(null, true, 204));

    await expect(createHttpApiClient('http://api', getToken).disconnectStrava()).resolves.toBeUndefined();
    expect((fetchSpy.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
  });

  it('throws on a non-ok response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({}, false, 401));

    await expect(createHttpApiClient('http://api', getToken).getStreet('s1')).rejects.toThrow('status 401');
  });
});
