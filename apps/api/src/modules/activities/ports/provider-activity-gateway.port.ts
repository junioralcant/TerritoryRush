import { IngestedActivityData, Provider } from '../activities.types';

/**
 * Provider-agnostic fetch of an activity's metrics and GPS streams. Each provider
 * (Strava now, Garmin in Task 12) implements this, encapsulating token refresh and
 * the provider's HTTP API. Mocked at this boundary in tests.
 */
export interface ProviderActivityGateway {
  readonly provider: Provider;
  fetchIngestData(userId: string, providerActivityId: string): Promise<IngestedActivityData>;
}
