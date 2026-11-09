import { listCallbacks } from '../api/callbacks';
import { useApiQuery } from '../hooks/useApiQuery';
import type { CallbackInfo } from '../models/apiDefinition';
import { ErrorBanner } from './ErrorBanner';
import { t } from '../i18n/language';

interface CallbackSelectProps {
  responseFormat: string;
  // Id del callback elegido, que es lo que C-TRD espera en callbackFunction
  value: string;
  // Recibe el callback completo para mostrar sus parametros
  onChange: (callback: CallbackInfo | null) => void;
  invalid?: boolean;
}

// Callbacks que saben leer el formato de respuesta de la API elegida (GET /list/callbacks)
export function CallbackSelect({ responseFormat, value, onChange, invalid = false }: CallbackSelectProps) {
  const callbacks = useApiQuery((signal) => listCallbacks(responseFormat, signal), [responseFormat]);
  const options = callbacks.data?.callbacks ?? [];
  const selected = options.find((callback) => callback.id === value);

  return (
    <>
      <select
        value={value}
        onChange={(event) => onChange(options.find((callback) => callback.id === event.target.value) ?? null)}
        disabled={callbacks.isLoading}
        aria-invalid={invalid}
      >
        <option value="" disabled>
          {callbacks.isLoading
            ? t('Cargando…', 'Loading…')
            : options.length === 0
              ? t('Ningun callback lee esta API', 'No callback reads this API')
              : t('Elige un callback', 'Choose a callback')}
        </option>
        {options.map((callback) => (
          <option key={callback.id} value={callback.id}>
            {callback.name}
          </option>
        ))}
      </select>
      {selected && (
        <span className="form-field__hint">
          {t('Se cumple cuando:', 'Met when:')} {selected.description}
        </span>
      )}
      {callbacks.error && <ErrorBanner error={callbacks.error} onRetry={callbacks.refetch} stale={!!callbacks.data} />}
    </>
  );
}
