import { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../../services/api/api-client.port';
import { StravaConnectionState } from '../../services/api/types';

export type UseConnectionsOptions = {
  startStravaAuth: () => Promise<string | null>;
};

export type UseConnectionsResult = {
  connection: StravaConnectionState | null;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export const useConnections = (api: ApiClient, options: UseConnectionsOptions): UseConnectionsResult => {
  const [connection, setConnection] = useState<StravaConnectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConnection(await api.getStravaConnection());
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      const code = await options.startStravaAuth();
      if (!code) {
        return;
      }
      setConnection(await api.connectStrava(code));
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, [api, options]);

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      await api.disconnectStrava();
      await refresh();
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, [api, refresh]);

  return { connection, loading, error, connect, disconnect };
};
