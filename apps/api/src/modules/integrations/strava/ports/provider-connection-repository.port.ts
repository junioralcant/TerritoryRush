import { Provider } from '../../../activities/activities.types';
import { ProviderConnection, UpsertProviderConnectionInput } from '../strava.types';

export const PROVIDER_CONNECTION_REPOSITORY = Symbol('PROVIDER_CONNECTION_REPOSITORY');

/**
 * Persistence contract for provider connections (Strava/Garmin). Tokens are
 * stored already encrypted by the caller.
 */
export interface ProviderConnectionRepository {
  upsert(input: UpsertProviderConnectionInput): Promise<void>;
  findByUserAndProvider(userId: string, provider: Provider): Promise<ProviderConnection | null>;
  findUserIdByAthlete(provider: Provider, athleteId: string): Promise<string | null>;
  delete(userId: string, provider: Provider): Promise<boolean>;
}
