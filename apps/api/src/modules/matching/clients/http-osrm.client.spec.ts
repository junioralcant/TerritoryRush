import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/app-config.type';
import { MetricsService } from '../../../observability/metrics.service';
import { GpsPoint } from '../matching.types';
import { OsrmUnmatchableTraceError } from '../osrm-unmatchable-trace.error';
import { HttpOsrmClient } from './http-osrm.client';

const config = { get: () => 'http://osrm.test' } as unknown as ConfigService<AppConfig, true>;
const metrics = { observeOsrmLatency: jest.fn() } as unknown as MetricsService;
const makeClient = (): HttpOsrmClient => new HttpOsrmClient(config, metrics);

const TRACE: GpsPoint[] = [
  { lat: -23.55, lng: -46.63, t: 0 },
  { lat: -23.56, lng: -46.64, t: 30 },
];

const okResponse = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

describe('HttpOsrmClient', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns an empty list for a trace with fewer than two points', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    expect(await makeClient().match([{ lat: 0, lng: 0, t: 0 }])).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('maps a successful match response into edges', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      okResponse({
        code: 'Ok',
        matchings: [{ legs: [{ steps: [{ name: 'Rua Maranhão', distance: 120, geometry: { coordinates: [[-46.63, -23.55]] } }] }] }],
      }),
    );

    const edges = await makeClient().match(TRACE);

    expect(edges).toEqual([{ streetName: 'Rua Maranhão', lengthM: 120, coordinate: [-46.63, -23.55] }]);
  });

  it('treats a 200 response with a non-Ok code as an unmatchable trace', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(okResponse({ code: 'NoMatch' }));

    await expect(makeClient().match(TRACE)).rejects.toBeInstanceOf(OsrmUnmatchableTraceError);
  });

  it('treats an HTTP 4xx as an unmatchable trace, surfacing the code without opening the circuit', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      { ok: false, status: 400, json: async () => ({ code: 'NoSegment' }) } as unknown as Response,
    );
    const client = makeClient();

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const error = await client.match(TRACE).catch((caught) => caught);
      expect(error).toBeInstanceOf(OsrmUnmatchableTraceError);
      expect(error.code).toBe('NoSegment');
    }
  });

  it('opens the circuit after repeated transient (5xx) failures', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500 } as unknown as Response);
    const client = makeClient();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(client.match(TRACE)).rejects.toThrow('status 500');
    }
    await expect(client.match(TRACE)).rejects.toThrow('circuit is open');
  });
});
