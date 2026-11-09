import type { ReactNode } from 'react';
import { listTriggers } from '../api/triggers';
import { useApiQuery } from '../hooks/useApiQuery';
import { useHashParams } from '../hooks/useHashRoute';
import { TriggerStatusTag, type Trigger } from '../models/trigger';
import { formatDateTime } from '../utils/format';
import { CopyButton } from './CopyButton';
import { ErrorBanner } from './ErrorBanner';
import { StatusBadge } from './StatusBadge';
import { t, type Localized } from '../i18n/language';
import { catalogLabel } from '../models/catalog';

// Maximo de C-TRD por pagina; un trigger no deberia acumular tantas versiones
const VERSIONS_LIMIT = 100;

interface VersionField {
  label: Localized;
  // Texto con el que se compara contra la version anterior
  compareKey: (trigger: Trigger) => string;
  render: (trigger: Trigger) => ReactNode;
}

const conditionNames = (trigger: Trigger) => (trigger.conditions ?? []).map((condition) => condition.nameCondition);

const VERSION_FIELDS: readonly VersionField[] = [
  { label: { es: 'Tag', en: 'Tag' }, compareKey: (tr) => tr.tag, render: (tr) => <code>{tr.tag}</code> },
  { label: { es: 'Nombre', en: 'Name' }, compareKey: (tr) => tr.name, render: (tr) => tr.name },
  { label: { es: 'Descripcion', en: 'Description' }, compareKey: (tr) => tr.description, render: (tr) => tr.description || '—' },
  { label: { es: 'Asset', en: 'Asset' }, compareKey: (tr) => tr.idAsset, render: (tr) => `${tr.tagAsset} · ${tr.asset}` },
  { label: { es: 'Accion', en: 'Action' }, compareKey: (tr) => tr.idAction, render: (tr) => tr.action || tr.tagAction },
  {
    label: { es: 'Velas', en: 'Candles' },
    compareKey: (tr) => `${tr.maxCandlestickQty}|${tr.idCandlestickTimeframe}`,
    render: (tr) =>
      `${tr.maxCandlestickQty} × ${catalogLabel({ tag: tr.tagCandlestickTimeframe, name: tr.candlestickTimeframe || tr.tagCandlestickTimeframe })}`,
  },
  {
    label: { es: 'Condiciones', en: 'Conditions' },
    // El orden importa: es el orden en que se evaluan
    compareKey: (tr) => (tr.conditions ?? []).map((condition) => condition.idCondition).join(','),
    render: (tr) =>
      conditionNames(tr).length === 0 ? (
        <span className="muted">{t('Sin condiciones', 'No conditions')}</span>
      ) : (
        <ol className="version__conditions">
          {conditionNames(tr).map((name, index) => (
            <li key={index}>{name}</li>
          ))}
        </ol>
      ),
  },
];

// Detalle de todas las versiones de un trigger (#/triggers/versiones?id=<id de la version original>), la mas
// reciente primero. Cada campo que cambio respecto a la version anterior queda marcado
export function TriggerVersionsPage() {
  const rootId = useHashParams().get('id') ?? '';

  const versions = useApiQuery(
    (signal) => listTriggers({ limit: VERSIONS_LIMIT, showReferences: true, idReferenceRoot: rootId }, signal),
    [rootId],
  );

  const triggers = versions.data?.triggers ?? [];
  const total = versions.data?.page ?? 0;
  const latest = triggers[0];
  const original = triggers[triggers.length - 1];

  return (
    <main className="page page--narrow">
      <div className="page__head">
        <div>
          <h1>{t('Versiones del trigger', 'Trigger versions')}</h1>
          <p className="muted small">
            {latest ? (
              <>
                {latest.name} · {total} {total === 1 ? t('version', 'version') : t('versiones', 'versions')} ·{' '}
                {t('creado', 'created')}{' '}
                {formatDateTime(original?.createdDate)}
              </>
            ) : (
              t(
                'Cada actualizacion crea una version nueva y deja inactiva la anterior.',
                'Each update creates a new version and inactivates the previous one.',
              )
            )}
          </p>
        </div>
        <a className="button" href="#/triggers">
          {t('Volver a los triggers', 'Back to triggers')}
        </a>
      </div>

      {!rootId ? (
        <p className="empty panel">
          {t(
            'Falta el trigger: abre esta vista desde el detalle de un trigger.',
            'Missing trigger: open this view from the details of a trigger.',
          )}
        </p>
      ) : (
        <>
          {versions.error && <ErrorBanner error={versions.error} onRetry={versions.refetch} stale={!!versions.data} />}
          {versions.isLoading ? (
            <p className="empty panel">{t('Cargando versiones…', 'Loading versions…')}</p>
          ) : (
            versions.data &&
            (triggers.length === 0 ? (
              <p className="empty panel">{t('No se encontraron versiones de este trigger.', 'No versions found for this trigger.')}</p>
            ) : (
              <ol className="versions" aria-busy={versions.isRefreshing}>
                {triggers.map((trigger, index) => (
                  <TriggerVersion
                    key={trigger.id}
                    trigger={trigger}
                    number={total - index}
                    previous={triggers[index + 1]}
                  />
                ))}
              </ol>
            ))
          )}
          {total > triggers.length && (
            <p className="muted small">
              {t(
                `Mostrando las ${triggers.length} versiones mas recientes de ${total}.`,
                `Showing the ${triggers.length} most recent versions of ${total}.`,
              )}
            </p>
          )}
        </>
      )}
    </main>
  );
}

interface TriggerVersionProps {
  trigger: Trigger;
  number: number;
  // Version anterior en el tiempo; undefined en la original
  previous: Trigger | undefined;
}

function TriggerVersion({ trigger, number, previous }: TriggerVersionProps) {
  const current = trigger.tagStatus === TriggerStatusTag.Active;

  return (
    <li className="panel panel--padded version" data-current={current}>
      <div className="version__head">
        <h2>
          {t('Version', 'Version')} {number}
          {current && <span className="version__tag">{t('Actual', 'Current')}</span>}
          {!previous && <span className="version__tag">{t('Original', 'Original')}</span>}
        </h2>
        <StatusBadge tag={trigger.tagStatus} label={trigger.status || trigger.tagStatus} />
      </div>
      <p className="muted small">
        {t('Creada', 'Created')} {formatDateTime(trigger.createdDate)}
        {!current && t(` · reemplazada ${formatDateTime(trigger.lastUpdatedAt)}`, ` · replaced ${formatDateTime(trigger.lastUpdatedAt)}`)}
      </p>

      <dl className="kv kv--wide">
        {VERSION_FIELDS.map((field) => {
          const changed = previous !== undefined && field.compareKey(trigger) !== field.compareKey(previous);
          return (
            <div key={field.label.es} className="version__field" data-changed={changed}>
              <dt>
                {t(field.label)}
                {changed && <span className="version__changed">{t('cambio', 'changed')}</span>}
              </dt>
              <dd>{field.render(trigger)}</dd>
            </div>
          );
        })}
      </dl>

      <p className="tracking copy-row">
        ID {trigger.id}
        <CopyButton text={trigger.id} />
      </p>
    </li>
  );
}
