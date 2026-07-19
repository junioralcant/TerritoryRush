import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { RunnerProfileDetail, StreetSummary } from '../../services/api/types';
import { MapScreen } from './MapScreen';

const streets: StreetSummary[] = [
  { id: 's1', name: 'A', cityId: 'c', ownership: 'unclaimed', ownerUserId: null, geometry: { type: 'MultiLineString', coordinates: [] } },
  { id: 's2', name: 'B', cityId: 'c', ownership: 'mine', ownerUserId: 'u1', geometry: { type: 'MultiLineString', coordinates: [] } },
  { id: 's3', name: 'C', cityId: 'c', ownership: 'other', ownerUserId: 'u2', geometry: { type: 'MultiLineString', coordinates: [] } },
];

const profile: RunnerProfileDetail = {
  id: 'p1',
  userId: 'u1',
  name: 'Junior Lima',
  city: 'Salvador, BA',
  photoUrl: null,
  totalDistanceM: 1264000,
  streakDays: 14,
  totalPoints: 1250,
  streetsOwned: 243,
  streetsExplored: 512,
  cityId: 'city-a',
  cityRank: 12,
  nationalRank: 348,
};

const api = {
  getStreets: jest.fn().mockResolvedValue(streets),
  getStreet: jest.fn(),
  getProfile: jest.fn().mockResolvedValue(profile),
  getAchievements: jest.fn().mockResolvedValue([]),
  getNotifications: jest.fn().mockResolvedValue([]),
  getStravaConnection: jest.fn(),
  connectStrava: jest.fn(),
  disconnectStrava: jest.fn(),
} as unknown as ApiClient;

describe('MapScreen', () => {
  it('renders the territory map and the accessible three-state legend', async () => {
    render(<MapScreen api={api} />);

    await waitFor(() => expect(screen.getByTestId('territory-map')).toBeOnTheScreen());
    expect(screen.getByTestId('legend-unclaimed')).toBeOnTheScreen();
    expect(screen.getByTestId('legend-mine')).toBeOnTheScreen();
    expect(screen.getByTestId('legend-other')).toBeOnTheScreen();
  });

  it('shows the top bar streak metric and the notifications bell', async () => {
    render(<MapScreen api={api} />);

    await waitFor(() => expect(screen.getByTestId('map-notifications')).toBeOnTheScreen());
    expect(screen.getByText('14')).toBeOnTheScreen();
  });

  it('reloads the streets when the error retry is pressed', async () => {
    const failingApi = {
      ...api,
      getStreets: jest
        .fn()
        .mockRejectedValueOnce(new Error('Request /streets failed with status 500'))
        .mockResolvedValue(streets),
      getProfile: jest.fn().mockResolvedValue(profile),
      getNotifications: jest.fn().mockResolvedValue([]),
    } as unknown as ApiClient;

    render(<MapScreen api={failingApi} />);

    await waitFor(() => expect(screen.getByTestId('map-error')).toBeOnTheScreen());

    fireEvent.press(screen.getByTestId('error-retry'));

    await waitFor(() => expect(screen.getByTestId('territory-map')).toBeOnTheScreen());
    expect(failingApi.getStreets).toHaveBeenCalledTimes(2);
  });
});
