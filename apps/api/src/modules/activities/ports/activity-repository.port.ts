import {
  ActivityRecord,
  ActivityStatus,
  CreateActivityInput,
  IngestedActivityData,
} from '../activities.types';

export const ACTIVITY_REPOSITORY = Symbol('ACTIVITY_REPOSITORY');

/**
 * Persistence contract for imported activities. `createIfAbsent` is idempotent on
 * (provider, providerActivityId): a duplicate returns the existing record rather
 * than creating a second one.
 */
export interface ActivityRepository {
  createIfAbsent(input: CreateActivityInput): Promise<ActivityRecord>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, status: ActivityStatus, rejectionReason?: string | null): Promise<void>;
  saveIngestedData(id: string, data: IngestedActivityData): Promise<void>;
  findByUserAndStatus(userId: string, status?: ActivityStatus): Promise<ActivityRecord[]>;
  findByProviderActivityId(provider: string, providerActivityId: string): Promise<ActivityRecord | null>;
}
