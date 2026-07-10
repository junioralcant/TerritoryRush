import { renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Coordinate, useCurrentLocation } from './useCurrentLocation';

const FALLBACK: Coordinate = [-46.63, -23.55];

describe('useCurrentLocation', () => {
  afterEach(() => jest.clearAllMocks());

  it('centers on the device position when permission is granted', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { longitude: -43.2, latitude: -22.9 },
    });

    const { result } = renderHook(() => useCurrentLocation(FALLBACK));

    await waitFor(() => expect(result.current.resolving).toBe(false));
    expect(result.current.center).toEqual([-43.2, -22.9]);
  });

  it('keeps the fallback center when permission is denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => useCurrentLocation(FALLBACK));

    await waitFor(() => expect(result.current.resolving).toBe(false));
    expect(result.current.center).toEqual(FALLBACK);
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('keeps the fallback center when locating throws', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('no gps'));

    const { result } = renderHook(() => useCurrentLocation(FALLBACK));

    await waitFor(() => expect(result.current.resolving).toBe(false));
    expect(result.current.center).toEqual(FALLBACK);
  });
});
