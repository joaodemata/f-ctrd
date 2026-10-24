import type { ReactNode } from 'react';
import { listTriggers } from '../api/triggers';
import { useApiQuery } from '../hooks/useApiQuery';
import { useHashParams } from '../hooks/useHashRoute';
import { TriggerStatusTag, type Trigger } from '../models/trigger';
import { formatDateTime } from '../utils/format';
import { CopyButton } from './CopyButton';
import { ErrorBanner } from './ErrorBanner';
import { StatusBadge } from './StatusBadge';

// Maximo de C-TRD por pagina; un trigger no deberia acumular tantas versiones
const VERSIONS_LIMIT = 100;

interface VersionField {
  label: string;
  // Texto con el que se compara contra la version anterior
  compareKey: (trigger: Trigger) => string;
  render: (trigger: Trigger) => ReactNode;
}

const conditionNames = (trigger: Trigger) => (trigger.conditions ?? []).map((condition) => condition.nameCondition);

const VERSION_FIELDS: readonly VersionField[] = [
  { label: 'Tag', compareKey: (t) => t.tag, render: (t) => <code>{t.tag}</code> },
  { label: 'Nombre', compareKey: (t) => t.name, render: (t) => t.name },
  { label: 'Descripcion', compareKey: (t) => t.description, render: (t) => t.description || '—' },
  { label: 'Asset', compareKey: (t) => t.idAsset, render: (t) => `${t.tagAsset} · ${t.asset}` },
  { label: 'Accion', compareKey: (t) => t.idAction, render: (t) => t.action || t.tagAction },
  {
    label: 'Velas',
    compareKey: (t) => `${t.maxCandlestickQty}|${t.idCandlestickTimeframe}`,
    render: (t) => `${t.maxCandlestickQty} × ${t.candlestickTimeframe || t.tagCandlestickTimeframe}`,
  },
  {
    label: 'Condiciones',
    // El orden importa: es el orden en que se evaluan
    compareKey: (t) => (t.conditions ?? []).map((condition) => condition.idCondition).join(','),
    render: (t) =>
      conditionNames(t).length === 0 ? (
        <span className="muted">Sin condiciones</span>
      ) : (
        <ol className="version__conditions">
          {conditionNames(t).map((name, index) => (
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
          <h1>Versiones del trigger</h1>
          <p className="muted small">
            {latest ? (
              <>
                {latest.name} · {total} {total === 1 ? 'version' : 'versiones'} · creado{' '}
                {formatDateTime(original?.createdDate)}
              </>
            ) : (
              'Cada actualizacion crea una version nueva y deja inactiva la anterior.'
            )}
          </p>
        </div>
        <a className="button" href="#/triggers">
          Volver a los triggers
        </a>
      </div>

      {!rootId ? (
        <p className="empty panel">Falta el trigger: abre esta vista desde el detalle de un trigger.</p>
      ) : (
        <>
          {versions.error && <ErrorBanner error={versions.error} onRetry={versions.refetch} stale={!!versions.data} />}
          {versions.isLoading ? (
            <p className="empty panel">Cargando versiones…</p>
          ) : (
            versions.data &&
            (triggers.length === 0 ? (
              <p className="empty panel">No se encontraron versiones de este trigger.</p>
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
              Mostrando las {triggers.length} versiones mas recientes de {total}.
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
          Version {number}
          {current && <span className="version__tag">Actual</span>}
          {!previous && <span className="version__tag">Original</span>}
        </h2>
        <StatusBadge tag={trigger.tagStatus} label={trigger.status || trigger.tagStatus} />
      </div>
      <p className="muted small">
        Creada {formatDateTime(trigger.createdDate)}
        {!current && ` · reemplazada ${formatDateTime(trigger.lastUpdatedAt)}`}
      </p>

      <dl className="kv kv--wide">
        {VERSION_FIELDS.map((field) => {
          const changed = previous !== undefined && field.compareKey(trigger) !== field.compareKey(previous);
          return (
            <div key={field.label} className="version__field" data-changed={changed}>
              <dt>
                {field.label}
                {changed && <span className="version__changed">cambio</span>}
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
