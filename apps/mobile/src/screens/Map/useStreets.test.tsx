import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { Bbox, StreetDetail, StreetSummary } from '../../services/api/types';
import { useStreets } from './useStreets';

const bbox: Bbox = { minLng: -1, minLat: -1, maxLng: 1, maxLat: 1 };

const streets: StreetSummary[] = [
  { id: 's1', name: 'A', cityId: 'c', ownership: 'mine', ownerUserId: 'u1', geometry: { type: 'MultiLineString', coordinates: [] } },
];
const detail: StreetDetail = {
  id: 's1', name: 'A', cityId: 'c', owner: { userId: 'u1', name: 'Ana' }, disputesCount: 0, tenureDays: 1, ranking: [], ownershipHistory: [],
};

const makeApi = (): ApiClient =>
  ({
    getStreets: jest.fn().mockResolvedValue(streets),
    getStreet: jest.fn().mockResolvedValue(detail),
    getStravaConnection: jest.fn(),
    connectStrava: jest.fn(),
    disconnectStrava: jest.fn(),
  }) as unknown as ApiClient;

describe('useStreets', () => {
  it('loads streets for the bbox', async () => {
    const api = makeApi();
    const { result } = renderHook(() => useStreets(api, bbox));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.streets).toHaveLength(1);
    expect(api.getStreets).toHaveBeenCalledWith(bbox);
  });

  it('loads the detail of a selected street', async () => {
    const api = makeApi();
    const { result } = renderHook(() => useStreets(api, bbox));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.selectStreet('s1');
    });

    expect(api.getStreet).toHaveBeenCalledWith('s1');
    expect(result.current.selected?.name).toBe('A');
  });
});
