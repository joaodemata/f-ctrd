import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiError } from '../api/errors';
import type { ApiResult } from '../api/types';

// Estado estandar de una consulta. `data` conserva el ultimo valor exitoso mientras se
// refresca o si el refresco falla, para que la pantalla no parpadee
export interface QueryState<T> {
  data: T | undefined;
  error: ApiError | undefined;
  isLoading: boolean; // primera carga, todavia no hay data
  isRefreshing: boolean; // hay data y se esta pidiendo de nuevo
  lastUpdated: Date | undefined;
  refetch: () => void;
}

export interface QueryOptions {
  // Refresco automatico en ms; 0 o undefined lo desactiva. Se pausa con la pestana oculta
  pollIntervalMs?: number;
}

export function useApiQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<ApiResult<T>>,
  deps: readonly unknown[],
  options: QueryOptions = {},
): QueryState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiError>();
  const [inFlight, setInFlight] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>();
  const [tick, setTick] = useState(0);

  // El fetcher cambia en cada render; las deps explicitas deciden cuando volver a pedir
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setInFlight(true);

    fetcherRef.current(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) {
        setData(result.data);
        setError(undefined);
        setLastUpdated(new Date());
      } else if (result.error.kind !== 'aborted') {
        setError(result.error);
      }
      setInFlight(false);
    });

    return () => controller.abort();
  }, [...deps, tick]);

  const { pollIntervalMs } = options;
  useEffect(() => {
    if (!pollIntervalMs) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refetch();
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs, refetch]);

  return {
    data,
    error,
    isLoading: inFlight && data === undefined,
    isRefreshing: inFlight && data !== undefined,
    lastUpdated,
    refetch,
  };
}
