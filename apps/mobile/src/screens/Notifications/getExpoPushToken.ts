import * as Notifications from 'expo-notifications';

/**
 * Requests notification permission and returns the device's Expo push token, or
 * null if permission is denied. Only yields a real token on a physical device.
 */
export const getExpoPushToken = async (): Promise<string | null> => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
};
