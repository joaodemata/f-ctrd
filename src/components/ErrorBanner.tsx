import type { ApiError } from '../api/errors';
import { t } from '../i18n/language';

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
        <strong>{stale ? t('No se pudo actualizar. ', 'Could not refresh. ') : ''}{error.message}</strong>
        {error.kind === 'rateLimit' && (
          <p className="muted">
            {error.retryAfterSeconds
              ? t(
                  `Espera ${error.retryAfterSeconds} s antes de reintentar.`,
                  `Wait ${error.retryAfterSeconds} s before retrying.`,
                )
              : t('Espera unos segundos antes de reintentar.', 'Wait a few seconds before retrying.')}
          </p>
        )}
        {error.kind === 'network' && (
          <p className="muted">
            {t(
              'Revisa que C-TRD este corriendo y que este origen este en JM_CTRD_CORS_ORIGINS.',
              'Check that C-TRD is running and that this origin is in JM_CTRD_CORS_ORIGINS.',
            )}
          </p>
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
          {t('Reintentar', 'Retry')}
        </button>
      )}
    </div>
  );
}
