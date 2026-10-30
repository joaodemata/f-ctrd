import type { Opportunity, RiskManagement } from '../models/opportunity';
import { formatDateTime, formatPrice, formatProbability } from '../utils/format';
import { RecordAccess } from './RecordAccess';
import { StatusBadge } from './StatusBadge';

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
        <p className="muted">Sin definir</p>
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
          <h4>Precios</h4>
          <dl className="kv">
            <dt>Disparo</dt>
            <dd>{formatPrice(opportunity.priceTriggered)}</dd>
            <dt>Activacion</dt>
            <dd>{formatPrice(opportunity.priceActiveOpportunity)}</dd>
            <dt>Cierre</dt>
            <dd>{formatPrice(opportunity.priceAchieved)}</dd>
          </dl>
        </div>
        <RiskList title="Stop loss" items={opportunity.stopLoss} />
        <RiskList title="Take profit" items={opportunity.takeProfit} />
        <div>
          <h4>Velas</h4>
          <p>
            Maximo {opportunity.maxCandlestickQty} de {opportunity.candlestickTimeframe || opportunity.tagCandlestickTimeframe}
          </p>
          <p className="muted">Actualizada {formatDateTime(opportunity.lastUpdatedAt)}</p>
        </div>
        {opportunity.cancelReason && (
          <div>
            <h4>Motivo de cancelacion</h4>
            <p>{opportunity.cancelReason}</p>
          </div>
        )}
        <RecordAccess record={opportunity} />
      </div>

      <h4>Condiciones ({conditions.length})</h4>
      {conditions.length === 0 ? (
        <p className="muted">Sin condiciones: la oportunidad se activa solo con el trigger.</p>
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
