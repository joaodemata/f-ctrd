import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiError } from '../api/errors';
import type { ApiResult } from '../api/types';

// Estado estandar de una escritura (crear, subir...). A diferencia de useApiQuery no se ejecuta sola:
// el formulario llama a `run` y lee `data` o `error`
export interface MutationState<TInput, T> {
  run: (input: TInput) => Promise<ApiResult<T>>;
  data: T | undefined;
  error: ApiError | undefined;
  isPending: boolean;
  reset: () => void;
}

export function useApiMutation<TInput, T>(
  mutator: (input: TInput, signal: AbortSignal) => Promise<ApiResult<T>>,
): MutationState<TInput, T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiError>();
  const [isPending, setIsPending] = useState(false);

  const mutatorRef = useRef(mutator);
  mutatorRef.current = mutator;
  const controllerRef = useRef<AbortController>();

  // Si el componente se desmonta se cancela la peticion en curso
  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = useCallback(async (input: TInput) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setIsPending(true);
    setData(undefined);
    setError(undefined);
    const result = await mutatorRef.current(input, controller.signal);
    if (controller.signal.aborted) return result;

    if (result.ok) {
      setData(result.data);
    } else if (result.error.kind !== 'aborted') {
      setError(result.error);
    }
    setIsPending(false);
    return result;
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setData(undefined);
    setError(undefined);
    setIsPending(false);
  }, []);

  return { run, data, error, isPending, reset };
}
