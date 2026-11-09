import type { ReactNode } from 'react';
import { catalogLabel, TIMEFRAME_MINUTES } from '../models/catalog';
import { previousTriggerId, triggerRootId, TriggerStatusTag, type Trigger } from '../models/trigger';
import { formatDateTime, formatDuration } from '../utils/format';
import { CopyButton } from './CopyButton';
import { RecordAccess } from './RecordAccess';
import { t } from '../i18n/language';

interface TriggerDetailProps {
  trigger: Trigger;
  // Sin onEdit no se ofrece editar (ej: en la revision de lo que crean los agentes)
  onEdit?: (trigger: Trigger) => void;
  // Acciones extra junto a las de edicion y versiones (ej: aprobar o rechazar)
  actions?: ReactNode;
}

// Panel expandido de un trigger: descripcion, velas, condiciones y cadena de versiones
export function TriggerDetail({ trigger, onEdit, actions }: TriggerDetailProps) {
  const conditions = trigger.conditions ?? [];
  const candleMinutes = TIMEFRAME_MINUTES[trigger.tagCandlestickTimeframe];
  // C-TRD solo actualiza triggers no borrados; la version anterior de uno actualizado queda Inactiva y borrada
  const editable = trigger.tagStatus === TriggerStatusTag.Active;
  const previousId = previousTriggerId(trigger);

  return (
    <div className="detail">
      <div className="detail__grid">
        <div>
          <h4>{t('Descripcion', 'Description')}</h4>
          <p>{trigger.description || '—'}</p>
        </div>
        <div>
          <h4>{t('Velas', 'Candles')}</h4>
          <p>
            {t('Maximo', 'Max')} {trigger.maxCandlestickQty} {t('de', 'of')}{' '}
            {catalogLabel({
              tag: trigger.tagCandlestickTimeframe,
              name: trigger.candlestickTimeframe || trigger.tagCandlestickTimeframe,
            })}
          </p>
          {candleMinutes !== undefined && (
            <p className="muted">
              {t('Las oportunidades expiran tras', 'Opportunities expire after')}{' '}
              {formatDuration(candleMinutes * trigger.maxCandlestickQty)}.
            </p>
          )}
        </div>
        <div>
          <h4>{t('Fechas', 'Dates')}</h4>
          <dl className="kv">
            <dt>{t('Creado', 'Created')}</dt>
            <dd>{formatDateTime(trigger.createdDate)}</dd>
            <dt>{t('Actualizado', 'Updated')}</dt>
            <dd>{formatDateTime(trigger.lastUpdatedAt)}</dd>
          </dl>
        </div>
        <div>
          <h4>{t('Versiones', 'Versions')}</h4>
          {previousId ? (
            <dl className="kv">
              <dt>{t('Anterior', 'Previous')}</dt>
              <dd>
                <code className="small">{previousId}</code>
              </dd>
              <dt>{t('Original', 'Original')}</dt>
              <dd>
                <code className="small">{trigger.idReferenceRoot ?? '—'}</code>
              </dd>
            </dl>
          ) : (
            <p className="muted">{t('Version original, nunca se actualizo.', 'Original version, never updated.')}</p>
          )}
        </div>
        <RecordAccess record={trigger} />
      </div>

      <h4>
        {t('Condiciones', 'Conditions')} ({conditions.length})
      </h4>
      {conditions.length === 0 ? (
        <p className="muted">
          {t(
            'Sin condiciones: las oportunidades se activan solo con el trigger.',
            'No conditions: opportunities are activated by the trigger alone.',
          )}
        </p>
      ) : (
        <ol className="conditions conditions--plain">
          {conditions.map((condition) => (
            <li key={condition.idCondition}>
              <div>
                <strong>{condition.nameCondition}</strong>
                <span className="muted"> · {condition.nameProvider}</span>
                {condition.descriptionCondition && <p className="muted">{condition.descriptionCondition}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}

      {trigger.pineCode && (
        <>
          <h4 className="copy-row">
            {t('Codigo Pine', 'Pine code')}
            <CopyButton text={trigger.pineCode} />
          </h4>
          <pre className="code-block">{trigger.pineCode}</pre>
        </>
      )}

      <div className="form-actions">
        {actions}
        {onEdit &&
          (editable ? (
            <button type="button" className="button button--primary" onClick={() => onEdit(trigger)}>
              {t('Editar trigger', 'Edit trigger')}
            </button>
          ) : (
            <p className="muted small">
              {t(
                'Version inactiva o reemplazada: solo se puede editar la version activa.',
                'Inactive or replaced version: only the active version can be edited.',
              )}
            </p>
          ))}
        {previousId && (
          <a className="button" href={`#/triggers/versiones?id=${triggerRootId(trigger)}`}>
            {t('Mostrar detalle de versiones', 'Show version details')}
          </a>
        )}
      </div>
      <p className="tracking copy-row">
        ID {trigger.id}
        <CopyButton text={trigger.id} />
      </p>
    </div>
  );
}
