import { act, renderHook } from '@testing-library/react-native';
import { ApiClient } from './api/api-client.port';
import { Activity } from './api/types';
import { useStravaSync } from './useStravaSync';

const processed: Activity[] = [
  {
    id: 'a1',
    provider: 'strava',
    providerActivityId: '1',
    status: 'processed',
    distanceM: 5000,
    movingTimeS: 1800,
    avgPaceSKm: 360,
    startedAt: null,
    rejectionReason: null,
  },
];

const makeApi = (enqueued: number): jest.Mocked<Pick<ApiClient, 'syncStrava' | 'getActivities'>> => ({
  syncStrava: jest.fn().mockResolvedValue({ enqueued }),
  getActivities: jest.fn().mockResolvedValue(processed),
});

describe('useStravaSync', () => {
  it('triggers the sync endpoint and runs the refetch callback', async () => {
    const api = makeApi(0);
    const onSynced = jest.fn();
    const { result } = renderHook(() => useStravaSync(api as unknown as ApiClient));

    await act(async () => {
      await result.current.sync(onSynced);
    });

    expect(api.syncStrava).toHaveBeenCalledTimes(1);
    expect(onSynced).toHaveBeenCalledTimes(1);
    expect(result.current.syncing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('waits for processing to settle before refetching when runs are enqueued', async () => {
    const api = makeApi(2);
    const onSynced = jest.fn();
    const { result } = renderHook(() => useStravaSync(api as unknown as ApiClient));

    await act(async () => {
      await result.current.sync(onSynced);
    });

    expect(api.getActivities).toHaveBeenCalled();
    expect(onSynced).toHaveBeenCalledTimes(1);
  });

  it('exposes the error when the sync fails and clears the syncing flag', async () => {
    const api = makeApi(0);
    api.syncStrava.mockRejectedValueOnce(new Error('Request failed with status 404'));
    const { result } = renderHook(() => useStravaSync(api as unknown as ApiClient));

    await act(async () => {
      await result.current.sync();
    });

    expect(result.current.error).toBe('Request failed with status 404');
    expect(result.current.syncing).toBe(false);
  });
});
