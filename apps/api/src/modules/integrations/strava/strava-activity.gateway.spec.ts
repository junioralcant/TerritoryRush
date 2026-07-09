import { ActivityMetrics, GpsStreams } from '../../activities/activities.types';
import { StravaActivityClient } from './ports/strava-activity-client.port';
import { StravaActivityGateway } from './strava-activity.gateway';
import { StravaTokenService } from './strava-token.service';

const METRICS: ActivityMetrics = { distanceM: 5000, movingTimeS: 1500, avgPaceSKm: 300, startedAt: null };
const STREAMS: GpsStreams = { latlng: [[0, 0]], time: [0] };

describe('StravaActivityGateway', () => {
  it('refreshes the token before fetching activity and streams', async () => {
    const tokenService = { getFreshAccessToken: jest.fn().mockResolvedValue('fresh-token') } as unknown as StravaTokenService;
    const client: jest.Mocked<StravaActivityClient> = {
      fetchActivity: jest.fn().mockResolvedValue(METRICS),
      fetchStreams: jest.fn().mockResolvedValue(STREAMS),
    };

    const result = await new StravaActivityGateway(tokenService, client).fetchIngestData('user-1', '555');

    expect(tokenService.getFreshAccessToken).toHaveBeenCalledWith('user-1');
    expect(client.fetchActivity).toHaveBeenCalledWith('555', 'fresh-token');
    expect(client.fetchStreams).toHaveBeenCalledWith('555', 'fresh-token');
    expect(result).toEqual({ metrics: METRICS, streams: STREAMS });
  });

  it('exposes the strava provider tag', () => {
    const gateway = new StravaActivityGateway(
      { getFreshAccessToken: jest.fn() } as unknown as StravaTokenService,
      { fetchActivity: jest.fn(), fetchStreams: jest.fn() },
    );

    expect(gateway.provider).toBe('strava');
  });
});
