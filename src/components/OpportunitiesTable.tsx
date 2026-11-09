import { Fragment, useState } from 'react';
import { ConditionStatusTag, type Opportunity } from '../models/opportunity';
import { formatDateTime, formatPrice, formatTimeLeft } from '../utils/format';
import { OpportunityDetail } from './OpportunityDetail';
import { StatusBadge } from './StatusBadge';
import { t } from '../i18n/language';

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
    return (
      <div className="empty">
        <p>{t('No hay oportunidades con estos filtros.', 'No opportunities match these filters.')}</p>
        <p className="tagline">{t('Las buenas oportunidades toman tiempo en crecer.', 'Good opportunities take time to grow.')}</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="table table--cards">
        <thead>
          <tr>
            <th scope="col" aria-label={t('Expandir', 'Expand')} />
            <th scope="col">{t('Activo', 'Asset')}</th>
            <th scope="col">{t('Accion', 'Action')}</th>
            <th scope="col">{t('Estado', 'Status')}</th>
            <th scope="col">{t('Condiciones', 'Conditions')}</th>
            <th scope="col" className="num">
              {t('Precio disparo', 'Trigger price')}
            </th>
            <th scope="col">{t('Creada', 'Created')}</th>
            <th scope="col">{t('Expira', 'Expires')}</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opportunity) => {
            const expanded = expandedId === opportunity.id;
            return (
              <Fragment key={opportunity.id}>
                <tr className="table__row" data-expanded={expanded} data-status={opportunity.tagStatus}>
                  <td className="cell--toggle">
                    <button
                      type="button"
                      className="icon-button"
                      aria-expanded={expanded}
                      aria-label={expanded ? t('Ocultar detalle', 'Hide details') : t('Ver detalle', 'Show details')}
                      onClick={() => setExpandedId(expanded ? null : opportunity.id)}
                    >
                      {expanded ? '▾' : '▸'}
                    </button>
                  </td>
                  <td className="cell--main">
                    <strong>{opportunity.asset || opportunity.tagAsset}</strong>
                    <div className="muted small">{opportunity.tagTrigger}</div>
                  </td>
                  <td data-label={t('Accion', 'Action')}>{opportunity.action || opportunity.tagAction}</td>
                  <td data-label={t('Estado', 'Status')}>
                    <StatusBadge tag={opportunity.tagStatus} label={opportunity.status || opportunity.tagStatus} />
                  </td>
                  <td data-label={t('Condiciones', 'Conditions')}>{conditionsMet(opportunity)}</td>
                  <td className="num" data-label={t('Precio disparo', 'Trigger price')}>{formatPrice(opportunity.priceTriggered)}</td>
                  <td data-label={t('Creada', 'Created')}>{formatDateTime(opportunity.createdDate)}</td>
                  <td data-label={t('Expira', 'Expires')} title={formatDateTime(opportunity.expirationDate)}>{formatTimeLeft(opportunity.expirationDate)}</td>
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
