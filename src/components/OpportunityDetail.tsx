import type { Opportunity, RiskManagement } from '../models/opportunity';
import { formatDateTime, formatPrice, formatProbability } from '../utils/format';
import { RecordAccess } from './RecordAccess';
import { StatusBadge } from './StatusBadge';
import { t } from '../i18n/language';
import { catalogLabel } from '../models/catalog';

function RiskList({ title, items }: { title: string; items: RiskManagement[] | null }) {
  return (
    <div>
      <h4>{title}</h4>
      {items && items.length > 0 ? (
        <ul className="plain-list">
          {items.map((item, index) => (
            <li key={index}>
              {formatPrice(item.targetPrice)}
              {item.probability !== undefined && <span className="muted"> · {formatProbability(item.probability)}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t('Sin definir', 'Not set')}</p>
      )}
    </div>
  );
}

// Panel expandido de una oportunidad: condiciones, precios y gestion de riesgo
export function OpportunityDetail({ opportunity }: { opportunity: Opportunity }) {
  const conditions = opportunity.conditions ?? [];

  return (
    <div className="detail">
      <div className="detail__grid">
        <div>
          <h4>Trigger</h4>
          <p>{opportunity.trigger || opportunity.tagTrigger}</p>
          {opportunity.descriptionTrigger && <p className="muted">{opportunity.descriptionTrigger}</p>}
        </div>
        <div>
          <h4>{t('Precios', 'Prices')}</h4>
          <dl className="kv">
            <dt>{t('Disparo', 'Trigger')}</dt>
            <dd>{formatPrice(opportunity.priceTriggered)}</dd>
            <dt>{t('Activacion', 'Activation')}</dt>
            <dd>{formatPrice(opportunity.priceActiveOpportunity)}</dd>
            <dt>{t('Cierre', 'Close')}</dt>
            <dd>{formatPrice(opportunity.priceAchieved)}</dd>
          </dl>
        </div>
        <RiskList title="Stop loss" items={opportunity.stopLoss} />
        <RiskList title="Take profit" items={opportunity.takeProfit} />
        <div>
          <h4>{t('Velas', 'Candles')}</h4>
          <p>
            {t('Maximo', 'Max')} {opportunity.maxCandlestickQty} {t('de', 'of')}{' '}
            {catalogLabel({
              tag: opportunity.tagCandlestickTimeframe,
              name: opportunity.candlestickTimeframe || opportunity.tagCandlestickTimeframe,
            })}
          </p>
          <p className="muted">
            {t('Actualizada', 'Updated')} {formatDateTime(opportunity.lastUpdatedAt)}
          </p>
        </div>
        {opportunity.cancelReason && (
          <div>
            <h4>{t('Motivo de cancelacion', 'Cancel reason')}</h4>
            <p>{opportunity.cancelReason}</p>
          </div>
        )}
        <RecordAccess record={opportunity} />
      </div>

      <h4>
        {t('Condiciones', 'Conditions')} ({conditions.length})
      </h4>
      {conditions.length === 0 ? (
        <p className="muted">
          {t(
            'Sin condiciones: la oportunidad se activa solo con el trigger.',
            'No conditions: the opportunity is activated by the trigger alone.',
          )}
        </p>
      ) : (
        <ul className="conditions">
          {conditions.map((condition) => (
            <li key={condition.idCondition}>
              <StatusBadge tag={condition.tagStatus} label={condition.status || condition.tagStatus} />
              <div>
                <strong>{condition.nameCondition}</strong>
                <span className="muted"> · {condition.nameProvider}</span>
                {condition.descriptionCondition && <p className="muted">{condition.descriptionCondition}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="tracking">ID {opportunity.id}</p>
    </div>
  );
}
