import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { StravaConnectionState } from '../../services/api/types';
import { ConnectionsScreen } from './ConnectionsScreen';

const disconnected: StravaConnectionState = { provider: 'strava', connected: false, athleteId: null, scopes: [], expiresAt: null };
const connected: StravaConnectionState = { provider: 'strava', connected: true, athleteId: '42', scopes: ['read'], expiresAt: null };

const makeApi = (initial: StravaConnectionState): ApiClient =>
  ({
    getStravaConnection: jest.fn().mockResolvedValue(initial),
    connectStrava: jest.fn().mockResolvedValue(connected),
    disconnectStrava: jest.fn().mockResolvedValue(undefined),
    getStreets: jest.fn(),
    getStreet: jest.fn(),
  }) as unknown as ApiClient;

describe('ConnectionsScreen', () => {
  it('shows the disconnected state and connects on press', async () => {
    const api = makeApi(disconnected);
    const startStravaAuth = jest.fn().mockResolvedValue('auth-code');
    render(<ConnectionsScreen api={api} startStravaAuth={startStravaAuth} />);

    await waitFor(() => expect(screen.getByTestId('strava-status')).toHaveTextContent('Strava não conectado'));

    fireEvent.press(screen.getByTestId('connect-strava'));

    await waitFor(() => expect(api.connectStrava).toHaveBeenCalledWith('auth-code'));
    await waitFor(() => expect(screen.getByTestId('strava-status')).toHaveTextContent('Strava conectado'));
  });

  it('shows the connected state and disconnects on press', async () => {
    const api = makeApi(connected);
    render(<ConnectionsScreen api={api} startStravaAuth={jest.fn()} />);

    await waitFor(() => expect(screen.getByTestId('disconnect-strava')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('disconnect-strava'));

    await waitFor(() => expect(api.disconnectStrava).toHaveBeenCalled());
  });
});
