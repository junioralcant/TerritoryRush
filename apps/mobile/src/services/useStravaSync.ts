import { useCallback, useState } from 'react';
import { ApiClient } from './api/api-client.port';

const SETTLE_DELAY_MS = 1500;
const SETTLE_MAX_POLLS = 8;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * After enqueuing a sync, the ingestion worker fetches + matches + scores each run
 * asynchronously. Poll the activities feed until nothing is still importing/processing
 * (or a timeout) so the caller refetches once the territory/points have settled.
 */
const waitForProcessing = async (api: ApiClient): Promise<void> => {
  for (let attempt = 0; attempt < SETTLE_MAX_POLLS; attempt += 1) {
    const activities = await api.getActivities();
    const pending = activities.some((activity) => activity.status === 'imported' || activity.status === 'processing');
    if (!pending) {
      return;
    }
    await delay(SETTLE_DELAY_MS);
  }
};

export type UseStravaSyncResult = {
  syncing: boolean;
  error: string | null;
  sync: (onSynced?: () => void | Promise<void>) => Promise<void>;
};

/**
 * Triggers the on-demand Strava sync (POST /integrations/strava/sync), waits for the
 * newly imported runs to finish processing, then runs `onSynced` so the screen can
 * refetch the map, points and feed. Backs the "Atualizar atividades" button.
 */
export const useStravaSync = (api: ApiClient): UseStravaSyncResult => {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(
    async (onSynced?: () => void | Promise<void>) => {
      setSyncing(true);
      setError(null);
      try {
        const result = await api.syncStrava();
        if (result.enqueued > 0) {
          await delay(SETTLE_DELAY_MS);
          await waitForProcessing(api);
        }
        await onSynced?.();
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setSyncing(false);
      }
    },
    [api],
  );

  return { syncing, error, sync };
};
