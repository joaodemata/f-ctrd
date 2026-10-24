import { useState } from 'react';
import { listConditions } from '../api/conditions';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { Condition } from '../models/condition';
import { ErrorBanner } from './ErrorBanner';
import { StatusBadge } from './StatusBadge';

const PICKER_LIMIT = 20;

// Lo minimo para mostrar una condicion elegida: al editar un trigger solo se conoce su id y nombre
export type ConditionOption = Pick<Condition, 'id' | 'nameCondition'>;

interface ConditionPickerProps {
  value: ConditionOption[];
  onChange: (conditions: ConditionOption[]) => void;
  disabled?: boolean;
}

// Seleccion multiple de condiciones (GET /list/conditions). El orden de seleccion es el que se envia a C-TRD
export function ConditionPicker({ value, onChange, disabled = false }: ConditionPickerProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());

  const conditions = useApiQuery(
    (signal) => listConditions({ limit: PICKER_LIMIT, search: debouncedSearch }, signal),
    [debouncedSearch],
  );

  const selectedIds = new Set(value.map((condition) => condition.id));
  const options = conditions.data?.conditions ?? [];
  const total = conditions.data?.page ?? 0;

  const toggle = (condition: ConditionOption) => {
    onChange(
      selectedIds.has(condition.id) ? value.filter((item) => item.id !== condition.id) : [...value, condition],
    );
  };

  return (
    <div className="picker">
      {value.length > 0 && (
        <ol className="chips" aria-label="Condiciones elegidas">
          {value.map((condition) => (
            <li key={condition.id} className="chip">
              <span>{condition.nameCondition}</span>
              <button
                type="button"
                className="chip__remove"
                aria-label={`Quitar ${condition.nameCondition}`}
                onClick={() => toggle(condition)}
                disabled={disabled}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}

      <input
        type="search"
        placeholder="Buscar por nombre, descripcion, proveedor o callback"
        value={search}
        maxLength={100}
        onChange={(event) => setSearch(event.target.value)}
        disabled={disabled}
        aria-label="Buscar condicion"
      />

      {conditions.error && (
        <ErrorBanner error={conditions.error} onRetry={conditions.refetch} stale={!!conditions.data} />
      )}

      <div className="option-list" aria-busy={conditions.isLoading || conditions.isRefreshing}>
        {conditions.isLoading ? (
          <p className="empty">Cargando condiciones…</p>
        ) : options.length === 0 ? (
          <p className="empty">{debouncedSearch ? 'No hay condiciones con esta busqueda.' : 'Todavia no hay condiciones.'}</p>
        ) : (
          options.map((condition) => (
            <label key={condition.id} className="option-list__item">
              <input
                type="checkbox"
                checked={selectedIds.has(condition.id)}
                onChange={() => toggle(condition)}
                disabled={disabled}
              />
              <span>
                <strong>{condition.nameCondition}</strong>
                <span className="muted small"> · {condition.nameProvider} · {condition.callbackFunction}</span>
                {condition.descriptionCondition && (
                  <span className="muted small option-list__description">{condition.descriptionCondition}</span>
                )}
              </span>
              <StatusBadge tag={condition.tag_status} label={condition.status || condition.tag_status} />
            </label>
          ))
        )}
      </div>
      {total > options.length && (
        <span className="form-field__hint">
          Mostrando las {options.length} mas recientes de {total}; escribe para acotar la busqueda.
        </span>
      )}
    </div>
  );
}
