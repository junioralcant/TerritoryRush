export const STRAVA_SUBSCRIPTION_CLIENT = Symbol('STRAVA_SUBSCRIPTION_CLIENT');

/**
 * Contract for managing the single Strava push-subscription for this app
 * (external service). Mocked at this boundary in tests.
 */
export interface StravaSubscriptionClient {
  listSubscriptions(): Promise<number[]>;
  createSubscription(callbackUrl: string, verifyToken: string): Promise<number>;
  deleteSubscription(subscriptionId: number): Promise<void>;
}
