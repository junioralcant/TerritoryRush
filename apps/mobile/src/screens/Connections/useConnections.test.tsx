import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { StravaConnectionState } from '../../services/api/types';
import { useConnections } from './useConnections';

const disconnected: StravaConnectionState = { provider: 'strava', connected: false, athleteId: null, scopes: [], expiresAt: null };
const connected: StravaConnectionState = { provider: 'strava', connected: true, athleteId: '42', scopes: ['read'], expiresAt: null };

const makeApi = (): jest.Mocked<Pick<ApiClient, 'getStravaConnection' | 'connectStrava' | 'disconnectStrava'>> => ({
  getStravaConnection: jest.fn().mockResolvedValue(disconnected),
  connectStrava: jest.fn().mockResolvedValue(connected),
  disconnectStrava: jest.fn().mockResolvedValue(undefined),
});

describe('useConnections', () => {
  it('loads the current connection state', async () => {
    const api = makeApi();
    const { result } = renderHook(() => useConnections(api as unknown as ApiClient, { startStravaAuth: jest.fn() }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.connection?.connected).toBe(false);
  });

  it('connects when the OAuth flow returns a code', async () => {
    const api = makeApi();
    const startStravaAuth = jest.fn().mockResolvedValue('auth-code');
    const { result } = renderHook(() => useConnections(api as unknown as ApiClient, { startStravaAuth }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.connect();
    });

    expect(api.connectStrava).toHaveBeenCalledWith('auth-code');
    expect(result.current.connection?.connected).toBe(true);
  });

  it('does not connect when the OAuth flow is cancelled', async () => {
    const api = makeApi();
    const { result } = renderHook(() =>
      useConnections(api as unknown as ApiClient, { startStravaAuth: jest.fn().mockResolvedValue(null) }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.connect();
    });

    expect(api.connectStrava).not.toHaveBeenCalled();
  });

  it('disconnects and refreshes', async () => {
    const api = makeApi();
    const { result } = renderHook(() => useConnections(api as unknown as ApiClient, { startStravaAuth: jest.fn() }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.disconnect();
    });

    expect(api.disconnectStrava).toHaveBeenCalled();
  });
});
