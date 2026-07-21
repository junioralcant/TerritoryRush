import { CreateRunnerProfileInput, RunnerProfile, RunnerProfileAggregates } from '../profile.types';

export const PROFILE_REPOSITORY = Symbol('PROFILE_REPOSITORY');

/**
 * Persistence contract for runner profiles. `create` must be idempotent on
 * `user_id`: called twice for the same user it returns the existing profile
 * rather than raising or duplicating.
 */
export interface ProfileRepository {
  findByUserId(userId: string): Promise<RunnerProfile | null>;
  create(input: CreateRunnerProfileInput): Promise<RunnerProfile>;
  updateName(userId: string, name: string): Promise<RunnerProfile>;
  loadAggregates(userId: string): Promise<RunnerProfileAggregates>;
  /**
   * Ensures the runner profile exists and returns its `signed_up_at` (ISO). Used
   * as the cutoff for the initial activity seed; creating it here stamps the
   * signup date on first connect if the runner has not opened the app yet.
   */
  ensureSignedUpAt(userId: string): Promise<string>;
}
