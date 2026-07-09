import { render, screen, waitFor } from '@testing-library/react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { Bbox, StreetSummary } from '../../services/api/types';
import { MapScreen } from './MapScreen';

const bbox: Bbox = { minLng: -1, minLat: -1, maxLng: 1, maxLat: 1 };

const streets: StreetSummary[] = [
  { id: 's1', name: 'A', cityId: 'c', ownership: 'unclaimed', ownerUserId: null, geometry: { type: 'MultiLineString', coordinates: [] } },
  { id: 's2', name: 'B', cityId: 'c', ownership: 'mine', ownerUserId: 'u1', geometry: { type: 'MultiLineString', coordinates: [] } },
  { id: 's3', name: 'C', cityId: 'c', ownership: 'other', ownerUserId: 'u2', geometry: { type: 'MultiLineString', coordinates: [] } },
];

const api = {
  getStreets: jest.fn().mockResolvedValue(streets),
  getStreet: jest.fn(),
  getStravaConnection: jest.fn(),
  connectStrava: jest.fn(),
  disconnectStrava: jest.fn(),
} as unknown as ApiClient;

describe('MapScreen', () => {
  it('renders the territory map and the accessible three-state legend', async () => {
    render(<MapScreen api={api} bbox={bbox} />);

    await waitFor(() => expect(screen.getByTestId('territory-map')).toBeOnTheScreen());
    expect(screen.getByTestId('legend-unclaimed')).toBeOnTheScreen();
    expect(screen.getByTestId('legend-mine')).toBeOnTheScreen();
    expect(screen.getByTestId('legend-other')).toBeOnTheScreen();
  });
});
