import { ActivityStreetRecord, UpsertActivityStreetInput } from '../matching.types';

export const ACTIVITY_STREET_REPOSITORY = Symbol('ACTIVITY_STREET_REPOSITORY');

/**
 * Persistence contract for the activity↔street traceability table. `upsert` is
 * idempotent on (activity_id, street_id) so re-processing an activity does not
 * duplicate rows.
 */
export interface ActivityStreetRepository {
  hasUserVisitedStreet(userId: string, streetId: string, excludeActivityId: string): Promise<boolean>;
  upsert(input: UpsertActivityStreetInput): Promise<void>;
  findByActivity(activityId: string): Promise<ActivityStreetRecord[]>;
}
