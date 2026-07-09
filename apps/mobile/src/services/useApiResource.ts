import { useCallback, useEffect, useState } from 'react';

export type ApiResource<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/**
 * Loads an API resource on mount and exposes loading/error state plus a reload.
 * `loader` must be stable (wrap it in useCallback in the caller).
 */
export const useApiResource = <T>(loader: () => Promise<T>): ApiResource<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    (onDone?: () => void) => {
      setLoading(true);
      setError(null);
      loader()
        .then(setData)
        .catch((cause: Error) => setError(cause.message))
        .finally(() => {
          setLoading(false);
          onDone?.();
        });
    },
    [loader],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loader()
      .then((result) => active && setData(result))
      .catch((cause: Error) => active && setError(cause.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [loader]);

  return { data, loading, error, reload: () => run() };
};
