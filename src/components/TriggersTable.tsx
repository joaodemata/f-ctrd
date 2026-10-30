import { Fragment, useState } from 'react';
import { previousTriggerId, type Trigger } from '../models/trigger';
import { visibilityLabel } from '../models/visibility';
import { formatDateTime } from '../utils/format';
import { StatusBadge } from './StatusBadge';
import { TriggerDetail } from './TriggerDetail';

interface TriggersTableProps {
  triggers: Trigger[];
  onEdit: (trigger: Trigger) => void;
}

const COLUMN_COUNT = 8;

export function TriggersTable({ triggers, onEdit }: TriggersTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (triggers.length === 0) {
    return <p className="empty">No hay triggers con estos filtros.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col" aria-label="Expandir" />
            <th scope="col">Trigger</th>
            <th scope="col">Asset</th>
            <th scope="col">Accion</th>
            <th scope="col">Velas</th>
            <th scope="col" className="num">Condiciones</th>
            <th scope="col">Estado</th>
            <th scope="col">Creado</th>
          </tr>
        </thead>
        <tbody>
          {triggers.map((trigger) => {
            const expanded = expandedId === trigger.id;
            return (
              <Fragment key={trigger.id}>
                <tr className="table__row" data-expanded={expanded}>
                  <td>
                    <button
                      type="button"
                      className="icon-button"
                      aria-expanded={expanded}
                      aria-label={expanded ? 'Ocultar detalle' : 'Ver detalle'}
                      onClick={() => setExpandedId(expanded ? null : trigger.id)}
                    >
                      {expanded ? '▾' : '▸'}
                    </button>
                  </td>
                  <td>
                    <strong>{trigger.name}</strong>
                    <div className="muted small">
                      {trigger.tag}
                      {previousTriggerId(trigger) && ' · actualizado'}
                      {` · ${visibilityLabel(trigger)}`}
                    </div>
                  </td>
                  <td>{trigger.asset || trigger.tagAsset}</td>
                  <td>{trigger.action || trigger.tagAction}</td>
                  <td>
                    {trigger.maxCandlestickQty} × {trigger.candlestickTimeframe || trigger.tagCandlestickTimeframe}
                  </td>
                  <td className="num">{trigger.conditions?.length ?? 0}</td>
                  <td>
                    <StatusBadge tag={trigger.tagStatus} label={trigger.status || trigger.tagStatus} />
                  </td>
                  <td>{formatDateTime(trigger.createdDate)}</td>
                </tr>
                {expanded && (
                  <tr className="table__detail">
                    <td colSpan={COLUMN_COUNT}>
                      <TriggerDetail trigger={trigger} onEdit={onEdit} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
