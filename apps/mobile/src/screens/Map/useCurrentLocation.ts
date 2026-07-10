import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export type Coordinate = [number, number];

export type UseCurrentLocationResult = {
  center: Coordinate;
  resolving: boolean;
  permissionDenied: boolean;
  retry: () => void;
};

export const useCurrentLocation = (fallback: Coordinate): UseCurrentLocationResult => {
  const [center, setCenter] = useState<Coordinate>(fallback);
  const [resolving, setResolving] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setResolving(true);
    const resolve = async (): Promise<void> => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (active) {
            setPermissionDenied(true);
          }
          return;
        }
        if (active) {
          setPermissionDenied(false);
        }
        const position = await Location.getCurrentPositionAsync({});
        if (active) {
          setCenter([position.coords.longitude, position.coords.latitude]);
        }
      } catch {
        // mantém o fallback quando a localização não está disponível
      } finally {
        if (active) {
          setResolving(false);
        }
      }
    };
    void resolve();
    return () => {
      active = false;
    };
  }, [fallback[0], fallback[1], attempt]);

  return { center, resolving, permissionDenied, retry };
};
