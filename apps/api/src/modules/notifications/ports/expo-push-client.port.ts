import { ExpoPushMessage } from '../notifications.types';

export const EXPO_PUSH_CLIENT = Symbol('EXPO_PUSH_CLIENT');

/**
 * Contract for delivering push notifications via Expo (external service). Mocked
 * at this boundary in tests. Failures are handled by the caller as non-blocking.
 */
export interface ExpoPushClient {
  send(deviceTokens: string[], message: ExpoPushMessage): Promise<void>;
}
