import { listCatalogs } from '../api/catalogs';
import { useApiQuery } from '../hooks/useApiQuery';
import { catalogLabel, type Catalog, type CatalogType } from '../models/catalog';
import { ErrorBanner } from './ErrorBanner';
import { t } from '../i18n/language';

interface CatalogSelectProps {
  type: CatalogType;
  // Solo se usa el id; al editar un trigger no se tiene el catalogo completo
  value: Pick<Catalog, 'id' | 'tag' | 'name'> | null;
  onChange: (catalog: Catalog | null) => void;
  placeholder: string;
  // Opciones que C-TRD rechazaria, se muestran deshabilitadas con el motivo
  disabledReason?: (catalog: Catalog) => string | null;
  disabled?: boolean;
  invalid?: boolean;
}

// Select con los catalogos de un typeCatalog (GET /list/catalogs)
export function CatalogSelect({
  type,
  value,
  onChange,
  placeholder,
  disabledReason,
  disabled = false,
  invalid = false,
}: CatalogSelectProps) {
  const catalogs = useApiQuery((signal) => listCatalogs(type, signal), [type]);
  const options = catalogs.data?.catalogs ?? [];

  return (
    <>
      <select
        value={value?.id ?? ''}
        onChange={(event) => onChange(options.find((catalog) => catalog.id === event.target.value) ?? null)}
        disabled={disabled || catalogs.isLoading}
        aria-invalid={invalid}
      >
        <option value="" disabled>
          {catalogs.isLoading
            ? t('Cargando…', 'Loading…')
            : options.length === 0
              ? t('Sin opciones', 'No options')
              : placeholder}
        </option>
        {options.map((catalog) => {
          const reason = disabledReason?.(catalog) ?? null;
          return (
            <option key={catalog.id} value={catalog.id} disabled={reason !== null} title={catalog.description}>
              {catalogLabel(catalog)}
              {reason ? ` (${reason})` : ''}
            </option>
          );
        })}
      </select>
      {catalogs.error && <ErrorBanner error={catalogs.error} onRetry={catalogs.refetch} stale={!!catalogs.data} />}
    </>
  );
}
