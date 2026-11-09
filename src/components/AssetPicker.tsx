import { useState } from 'react';
import { listAssets } from '../api/assets';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import type { Asset } from '../models/asset';
import { ErrorBanner } from './ErrorBanner';
import { t } from '../i18n/language';

const PICKER_LIMIT = 50;

// Lo minimo para mostrar el asset elegido: al editar un trigger solo se conoce su id, tag y nombre
export type AssetOption = Pick<Asset, 'id' | 'tag' | 'name'> & Partial<Pick<Asset, 'typeName'>>;

interface AssetPickerProps {
  value: AssetOption | null;
  onChange: (asset: Asset | null) => void;
  disabled?: boolean;
  invalid?: boolean;
}

function assetLabel(asset: AssetOption): string {
  return `${asset.tag} · ${asset.name}${asset.typeName ? ` (${asset.typeName})` : ''}`;
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
          placeholder={t('Buscar por tag, nombre o tipo', 'Search by tag, name or type')}
          value={search}
          maxLength={100}
          onChange={(event) => setSearch(event.target.value)}
          disabled={disabled}
          aria-label={t('Buscar asset', 'Search asset')}
        />
        <select
          value={value?.id ?? ''}
          onChange={(event) => {
            // Si no esta en las opciones es el asset ya elegido: no cambia nada
            const asset = options.find((option) => option.id === event.target.value);
            if (asset) onChange(asset);
          }}
          disabled={disabled || assets.isLoading}
          aria-invalid={invalid}
          aria-label="Asset"
        >
          <option value="" disabled>
            {assets.isLoading
              ? t('Cargando…', 'Loading…')
              : options.length === 0
                ? t('Sin resultados', 'No results')
                : t('Elige un asset', 'Choose an asset')}
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
          {t(
            `Mostrando ${options.length} de ${total}; escribe para acotar la busqueda.`,
            `Showing ${options.length} of ${total}; type to narrow the search.`,
          )}
        </span>
      )}
      {assets.error && <ErrorBanner error={assets.error} onRetry={assets.refetch} stale={!!assets.data} />}
    </div>
  );
}
