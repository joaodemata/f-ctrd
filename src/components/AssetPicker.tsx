import { useState } from 'react';
import { listAssets } from '../api/assets';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { Asset } from '../models/asset';
import { ErrorBanner } from './ErrorBanner';

const PICKER_LIMIT = 50;

interface AssetPickerProps {
  value: Asset | null;
  onChange: (asset: Asset | null) => void;
  disabled?: boolean;
  invalid?: boolean;
}

function assetLabel(asset: Asset): string {
  return `${asset.tag} · ${asset.name}${asset.type_name ? ` (${asset.type_name})` : ''}`;
}

// Selector de asset con busqueda en C-TRD (GET /list/assets). El asset elegido se conserva aunque la busqueda cambie
export function AssetPicker({ value, onChange, disabled = false, invalid = false }: AssetPickerProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());

  const assets = useApiQuery(
    (signal) => listAssets({ limit: PICKER_LIMIT, search: debouncedSearch }, signal),
    [debouncedSearch],
  );

  const options = assets.data?.assets ?? [];
  const showSelected = value !== null && !options.some((asset) => asset.id === value.id);
  const total = assets.data?.page ?? 0;

  return (
    <div className="picker">
      <div className="picker__row">
        <input
          type="search"
          placeholder="Buscar por tag, nombre o tipo"
          value={search}
          maxLength={100}
          onChange={(event) => setSearch(event.target.value)}
          disabled={disabled}
          aria-label="Buscar asset"
        />
        <select
          value={value?.id ?? ''}
          onChange={(event) => onChange(options.find((asset) => asset.id === event.target.value) ?? value)}
          disabled={disabled || assets.isLoading}
          aria-invalid={invalid}
          aria-label="Asset"
        >
          <option value="" disabled>
            {assets.isLoading ? 'Cargando…' : options.length === 0 ? 'Sin resultados' : 'Elige un asset'}
          </option>
          {showSelected && <option value={value.id}>{assetLabel(value)}</option>}
          {options.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {assetLabel(asset)}
            </option>
          ))}
        </select>
      </div>
      {total > options.length && (
        <span className="form-field__hint">
          Mostrando {options.length} de {total}; escribe para acotar la busqueda.
        </span>
      )}
      {assets.error && <ErrorBanner error={assets.error} onRetry={assets.refetch} stale={!!assets.data} />}
    </div>
  );
}
