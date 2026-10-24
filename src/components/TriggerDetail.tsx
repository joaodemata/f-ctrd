import { TIMEFRAME_MINUTES } from '../models/catalog';
import { previousTriggerId, triggerRootId, TriggerStatusTag, type Trigger } from '../models/trigger';
import { formatDateTime, formatDuration } from '../utils/format';
import { CopyButton } from './CopyButton';

interface TriggerDetailProps {
  trigger: Trigger;
  onEdit: (trigger: Trigger) => void;
}

// Panel expandido de un trigger: descripcion, velas, condiciones y cadena de versiones
export function TriggerDetail({ trigger, onEdit }: TriggerDetailProps) {
  const conditions = trigger.conditions ?? [];
  const candleMinutes = TIMEFRAME_MINUTES[trigger.tagCandlestickTimeframe];
  // C-TRD solo actualiza triggers no borrados; la version anterior de uno actualizado queda Inactiva y borrada
  const editable = trigger.tagStatus === TriggerStatusTag.Active;
  const previousId = previousTriggerId(trigger);

  return (
    <div className="detail">
      <div className="detail__grid">
        <div>
          <h4>Descripcion</h4>
          <p>{trigger.description || '—'}</p>
        </div>
        <div>
          <h4>Velas</h4>
          <p>
            Maximo {trigger.maxCandlestickQty} de {trigger.candlestickTimeframe || trigger.tagCandlestickTimeframe}
          </p>
          {candleMinutes !== undefined && (
            <p className="muted">Las oportunidades expiran tras {formatDuration(candleMinutes * trigger.maxCandlestickQty)}.</p>
          )}
        </div>
        <div>
          <h4>Fechas</h4>
          <dl className="kv">
            <dt>Creado</dt>
            <dd>{formatDateTime(trigger.createdDate)}</dd>
            <dt>Actualizado</dt>
            <dd>{formatDateTime(trigger.lastUpdatedAt)}</dd>
          </dl>
        </div>
        <div>
          <h4>Versiones</h4>
          {previousId ? (
            <dl className="kv">
              <dt>Anterior</dt>
              <dd>
                <code className="small">{previousId}</code>
              </dd>
              <dt>Original</dt>
              <dd>
                <code className="small">{trigger.idReferenceRoot ?? '—'}</code>
              </dd>
            </dl>
          ) : (
            <p className="muted">Version original, nunca se actualizo.</p>
          )}
        </div>
      </div>

      <h4>Condiciones ({conditions.length})</h4>
      {conditions.length === 0 ? (
        <p className="muted">Sin condiciones: las oportunidades se activan solo con el trigger.</p>
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
          <h4>Codigo Pine</h4>
          <pre className="code-block">{trigger.pineCode}</pre>
        </>
      )}

      <div className="form-actions">
        {editable ? (
          <button type="button" className="button button--primary" onClick={() => onEdit(trigger)}>
            Editar trigger
          </button>
        ) : (
          <p className="muted small">Version inactiva o reemplazada: solo se puede editar la version activa.</p>
        )}
        {previousId && (
          <a className="button" href={`#/triggers/versiones?id=${triggerRootId(trigger)}`}>
            Mostrar detalle de versiones
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
