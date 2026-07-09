import { renderHook, waitFor } from '@testing-library/react-native';
import { ApiClient } from '../../services/api/api-client.port';
import { usePushRegistration } from './usePushRegistration';

describe('usePushRegistration', () => {
  it('registers the device token when a push token is available', async () => {
    const registerDeviceToken = jest.fn().mockResolvedValue(undefined);
    const api = { registerDeviceToken } as unknown as ApiClient;

    renderHook(() => usePushRegistration(api, async () => 'ExpoTok[abc]', 'ios'));

    await waitFor(() => expect(registerDeviceToken).toHaveBeenCalledWith('ExpoTok[abc]', 'ios'));
  });

  it('does not register when no push token is granted', async () => {
    const registerDeviceToken = jest.fn();
    const api = { registerDeviceToken } as unknown as ApiClient;

    renderHook(() => usePushRegistration(api, async () => null, 'android'));

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(registerDeviceToken).not.toHaveBeenCalled();
  });
});
