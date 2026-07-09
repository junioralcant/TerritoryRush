import { CreateRunnerProfileInput, RunnerProfile } from '../profile.types';

export const PROFILE_REPOSITORY = Symbol('PROFILE_REPOSITORY');

/**
 * Persistence contract for runner profiles. `create` must be idempotent on
 * `user_id`: called twice for the same user it returns the existing profile
 * rather than raising or duplicating.
 */
export interface ProfileRepository {
  findByUserId(userId: string): Promise<RunnerProfile | null>;
  create(input: CreateRunnerProfileInput): Promise<RunnerProfile>;
}
