import { useCallback, useEffect, useState } from 'react';
import { ApiClient } from '../../services/api/api-client.port';
import { StravaConnectionState } from '../../services/api/types';

export type UseConnectionsOptions = {
  startStravaAuth: () => Promise<string | null>;
};

export type UseConnectionsResult = {
  connection: StravaConnectionState | null;
  loading: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export const useConnections = (api: ApiClient, options: UseConnectionsOptions): UseConnectionsResult => {
  const [connection, setConnection] = useState<StravaConnectionState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setConnection(await api.getStravaConnection());
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = useCallback(async () => {
    const code = await options.startStravaAuth();
    if (!code) {
      return;
    }
    setConnection(await api.connectStrava(code));
  }, [api, options]);

  const disconnect = useCallback(async () => {
    await api.disconnectStrava();
    await refresh();
  }, [api, refresh]);

  return { connection, loading, connect, disconnect };
};
