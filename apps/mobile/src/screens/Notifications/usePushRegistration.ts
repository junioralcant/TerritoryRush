import { useEffect } from 'react';
import { ApiClient } from '../../services/api/api-client.port';

export type GetPushToken = () => Promise<string | null>;

/**
 * Registers the device's Expo push token with the backend on mount so the runner
 * can receive push notifications. `getPushToken` is injected (the production impl
 * uses expo-notifications on a real device); registration is best-effort.
 */
export const usePushRegistration = (api: ApiClient, getPushToken: GetPushToken, platform: string): void => {
  useEffect(() => {
    let active = true;
    getPushToken()
      .then((token) => {
        if (active && token) {
          return api.registerDeviceToken(token, platform);
        }
        return undefined;
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [api, getPushToken, platform]);
};
