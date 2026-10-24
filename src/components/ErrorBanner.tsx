import type { ApiError } from '../api/errors';

interface ErrorBannerProps {
  error: ApiError;
  onRetry?: () => void;
  // Hay data anterior en pantalla y el error es solo del ultimo refresco
  stale?: boolean;
}

// Presentacion estandar de un ApiError: mensaje, tracking code y detalle por campo
export function ErrorBanner({ error, onRetry, stale = false }: ErrorBannerProps) {
  const fieldEntries = Object.entries(error.fieldErrors);

  return (
    <div className="error-banner" role="alert">
      <div className="error-banner__body">
        <strong>{stale ? 'No se pudo actualizar. ' : ''}{error.message}</strong>
        {error.kind === 'network' && (
          <p className="muted">Revisa que C-TRD este corriendo y que este origen este en JM_CTRD_CORS_ORIGINS.</p>
        )}
        {fieldEntries.length > 0 ? (
          <ul>
            {fieldEntries.map(([field, message]) => (
              <li key={field}>
                <code>{field}</code>: {message}
              </li>
            ))}
          </ul>
        ) : (
          error.details.length > 0 && (
            <ul>
              {error.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )
        )}
        <span className="tracking">Tracking: {error.tracking}</span>
      </div>
      {onRetry && error.kind !== 'validation' && (
        <button type="button" className="button" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
