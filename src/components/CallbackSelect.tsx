import { listCallbacks } from '../api/callbacks';
import { useApiQuery } from '../hooks/useApiQuery';
import { ErrorBanner } from './ErrorBanner';

interface CallbackSelectProps {
  responseFormat: string;
  value: string;
  onChange: (name: string) => void;
  invalid?: boolean;
}

// Callbacks que saben leer el formato de respuesta de la API elegida (GET /list/callbacks)
export function CallbackSelect({ responseFormat, value, onChange, invalid = false }: CallbackSelectProps) {
  const callbacks = useApiQuery((signal) => listCallbacks(responseFormat, signal), [responseFormat]);
  const options = callbacks.data?.callbacks ?? [];
  const selected = options.find((callback) => callback.name === value);

  return (
    <>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={callbacks.isLoading}
        aria-invalid={invalid}
      >
        <option value="" disabled>
          {callbacks.isLoading ? 'Cargando…' : options.length === 0 ? 'Ningun callback lee esta API' : 'Elige un callback'}
        </option>
        {options.map((callback) => (
          <option key={callback.name} value={callback.name}>
            {callback.name}
          </option>
        ))}
      </select>
      {selected && <span className="form-field__hint">Se cumple cuando: {selected.description}</span>}
      {callbacks.error && <ErrorBanner error={callbacks.error} onRetry={callbacks.refetch} stale={!!callbacks.data} />}
    </>
  );
}
