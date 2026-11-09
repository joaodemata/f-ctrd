import { useEffect, useState } from 'react';
import { t } from '../i18n/language';

export interface FilterValues {
  search: string;
  startDate: string;
  endDate: string;
}

interface FiltersProps {
  value: FilterValues;
  onChange: (value: FilterValues) => void;
  disabled?: boolean;
  placeholder?: string;
}

const SEARCH_DEBOUNCE_MS = 350;

export function Filters({
  value,
  onChange,
  disabled = false,
  placeholder = t('Activo, accion, estado o trigger', 'Asset, action, status or trigger'),
}: FiltersProps) {
  // El texto se edita localmente y se propaga con debounce para no pedir en cada tecla
  const [search, setSearch] = useState(value.search);

  useEffect(() => setSearch(value.search), [value.search]);

  useEffect(() => {
    if (search === value.search) return;
    const id = setTimeout(() => onChange({ ...value, search }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search, value, onChange]);

  const invalidRange = value.startDate !== '' && value.endDate !== '' && value.startDate > value.endDate;

  return (
    <form className="filters" onSubmit={(event) => event.preventDefault()}>
      <label className="field field--grow">
        <span>{t('Buscar', 'Search')}</span>
        <input
          type="search"
          placeholder={placeholder}
          value={search}
          maxLength={100}
          onChange={(event) => setSearch(event.target.value)}
          disabled={disabled}
        />
      </label>
      <label className="field">
        <span>{t('Desde', 'From')}</span>
        <input
          type="date"
          value={value.startDate}
          max={value.endDate || undefined}
          onChange={(event) => onChange({ ...value, startDate: event.target.value })}
          disabled={disabled}
        />
      </label>
      <label className="field">
        <span>{t('Hasta', 'To')}</span>
        <input
          type="date"
          value={value.endDate}
          min={value.startDate || undefined}
          onChange={(event) => onChange({ ...value, endDate: event.target.value })}
          disabled={disabled}
        />
      </label>
      {(value.search || value.startDate || value.endDate) && (
        <button
          type="button"
          className="button button--ghost"
          onClick={() => onChange({ search: '', startDate: '', endDate: '' })}
        >
          {t('Limpiar', 'Clear')}
        </button>
      )}
      {invalidRange && <p className="field-error">
          {t('La fecha inicial no puede ser mayor a la final.', 'The start date cannot be after the end date.')}
        </p>}
    </form>
  );
}
