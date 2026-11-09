import { Fragment, useState, type ReactNode } from 'react';
import { previousTriggerId, type Trigger } from '../models/trigger';
import { visibilityLabel } from '../models/visibility';
import { formatDateTime } from '../utils/format';
import { StatusBadge } from './StatusBadge';
import { TriggerDetail } from './TriggerDetail';
import { t } from '../i18n/language';
import { catalogLabel } from '../models/catalog';

interface TriggersTableProps {
  triggers: Trigger[];
  // Sin onEdit el detalle no ofrece editar
  onEdit?: (trigger: Trigger) => void;
  // Acciones extra en el detalle de cada trigger (ej: aprobar o rechazar)
  detailActions?: (trigger: Trigger) => ReactNode;
  emptyMessage?: string;
}

const COLUMN_COUNT = 8;

export function TriggersTable({
  triggers,
  onEdit,
  detailActions,
  emptyMessage = t('No hay triggers con estos filtros.', 'No triggers match these filters.'),
}: TriggersTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (triggers.length === 0) {
    return <p className="empty">{emptyMessage}</p>;
  }

  return (
    <div className="table-wrap">
      <table className="table table--cards">
        <thead>
          <tr>
            <th scope="col" aria-label={t('Expandir', 'Expand')} />
            <th scope="col">Trigger</th>
            <th scope="col">Asset</th>
            <th scope="col">{t('Accion', 'Action')}</th>
            <th scope="col">{t('Velas', 'Candles')}</th>
            <th scope="col" className="num">
              {t('Condiciones', 'Conditions')}
            </th>
            <th scope="col">{t('Estado', 'Status')}</th>
            <th scope="col">{t('Creado', 'Created')}</th>
          </tr>
        </thead>
        <tbody>
          {triggers.map((trigger) => {
            const expanded = expandedId === trigger.id;
            return (
              <Fragment key={trigger.id}>
                <tr className="table__row" data-expanded={expanded}>
                  <td className="cell--toggle">
                    <button
                      type="button"
                      className="icon-button"
                      aria-expanded={expanded}
                      aria-label={expanded ? t('Ocultar detalle', 'Hide details') : t('Ver detalle', 'Show details')}
                      onClick={() => setExpandedId(expanded ? null : trigger.id)}
                    >
                      {expanded ? '▾' : '▸'}
                    </button>
                  </td>
                  <td className="cell--main">
                    <strong>{trigger.name}</strong>
                    <div className="muted small">
                      {trigger.tag}
                      {previousTriggerId(trigger) && t(' · actualizado', ' · updated')}
                      {` · ${visibilityLabel(trigger)}`}
                    </div>
                  </td>
                  <td data-label="Asset">{trigger.asset || trigger.tagAsset}</td>
                  <td data-label={t('Accion', 'Action')}>{trigger.action || trigger.tagAction}</td>
                  <td data-label={t('Velas', 'Candles')}>
                    {trigger.maxCandlestickQty} ×{' '}
                    {catalogLabel({
                      tag: trigger.tagCandlestickTimeframe,
                      name: trigger.candlestickTimeframe || trigger.tagCandlestickTimeframe,
                    })}
                  </td>
                  <td className="num" data-label={t('Condiciones', 'Conditions')}>{trigger.conditions?.length ?? 0}</td>
                  <td data-label={t('Estado', 'Status')}>
                    <StatusBadge tag={trigger.tagStatus} label={trigger.status || trigger.tagStatus} />
                  </td>
                  <td data-label={t('Creado', 'Created')}>{formatDateTime(trigger.createdDate)}</td>
                </tr>
                {expanded && (
                  <tr className="table__detail">
                    <td colSpan={COLUMN_COUNT}>
                      <TriggerDetail trigger={trigger} onEdit={onEdit} actions={detailActions?.(trigger)} />
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
