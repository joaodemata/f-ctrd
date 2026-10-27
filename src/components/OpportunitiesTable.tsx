import { Fragment, useState } from 'react';
import { ConditionStatusTag, type Opportunity } from '../models/opportunity';
import { formatDateTime, formatPrice, formatTimeLeft } from '../utils/format';
import { OpportunityDetail } from './OpportunityDetail';
import { StatusBadge } from './StatusBadge';

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
}

const COLUMN_COUNT = 8;

function conditionsMet(opportunity: Opportunity): string {
  const conditions = opportunity.conditions ?? [];
  if (conditions.length === 0) return '—';
  // Una condicion cumplida queda en STATUS-ACTIVE (cronjobs/check_conditions.go)
  const met = conditions.filter((condition) => condition.tagStatus === ConditionStatusTag.Active).length;
  return `${met}/${conditions.length}`;
}

export function OpportunitiesTable({ opportunities }: OpportunitiesTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (opportunities.length === 0) {
    return <p className="empty">No hay oportunidades con estos filtros.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col" aria-label="Expandir" />
            <th scope="col">Activo</th>
            <th scope="col">Accion</th>
            <th scope="col">Estado</th>
            <th scope="col">Condiciones</th>
            <th scope="col" className="num">Precio disparo</th>
            <th scope="col">Creada</th>
            <th scope="col">Expira</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opportunity) => {
            const expanded = expandedId === opportunity.id;
            return (
              <Fragment key={opportunity.id}>
                <tr className="table__row" data-expanded={expanded} data-status={opportunity.tagStatus}>
                  <td>
                    <button
                      type="button"
                      className="icon-button"
                      aria-expanded={expanded}
                      aria-label={expanded ? 'Ocultar detalle' : 'Ver detalle'}
                      onClick={() => setExpandedId(expanded ? null : opportunity.id)}
                    >
                      {expanded ? '▾' : '▸'}
                    </button>
                  </td>
                  <td>
                    <strong>{opportunity.asset || opportunity.tagAsset}</strong>
                    <div className="muted small">{opportunity.tagTrigger}</div>
                  </td>
                  <td>{opportunity.action || opportunity.tagAction}</td>
                  <td>
                    <StatusBadge tag={opportunity.tagStatus} label={opportunity.status || opportunity.tagStatus} />
                  </td>
                  <td>{conditionsMet(opportunity)}</td>
                  <td className="num">{formatPrice(opportunity.priceTriggered)}</td>
                  <td>{formatDateTime(opportunity.createdDate)}</td>
                  <td title={formatDateTime(opportunity.expirationDate)}>{formatTimeLeft(opportunity.expirationDate)}</td>
                </tr>
                {expanded && (
                  <tr className="table__detail" data-status={opportunity.tagStatus}>
                    <td colSpan={COLUMN_COUNT}>
                      <OpportunityDetail opportunity={opportunity} />
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
