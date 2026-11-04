import { useState } from 'react';
import { reviewCondition, reviewTrigger } from '../api/agents';
import { listConditions } from '../api/conditions';
import { listTriggers } from '../api/triggers';
import { useApiMutation } from '../hooks/useApiMutation';
import { useApiQuery } from '../hooks/useApiQuery';
import { ReviewDecision } from '../models/agent';
import { ConditionReviewStatusTag } from '../models/condition';
import { TriggerStatusTag } from '../models/trigger';
import { formatDateTime, formatDuration } from '../utils/format';
import { CallbackParametersList } from './ConditionsTable';
import { CopyButton } from './CopyButton';
import { ErrorBanner } from './ErrorBanner';
import { Pagination } from './Pagination';
import { ReviewButtons } from './ReviewButtons';
import { StatusBadge } from './StatusBadge';
import { TriggersTable } from './TriggersTable';

const DEFAULT_LIMIT = 10;

const VIEWS = [
  { tag: TriggerStatusTag.PendingForApprove, label: 'Pendientes' },
  { tag: TriggerStatusTag.NotApproved, label: 'No aprobados' },
] as const;

type ViewTag = (typeof VIEWS)[number]['tag'];

interface ReviewingState {
  id: string;
  decision: ReviewDecision;
}

// Revision del super usuario de lo que crean los agentes: triggers y condiciones pendientes de aprobacion
export function AgentReviewPage() {
  const [view, setView] = useState<ViewTag>(TriggerStatusTag.PendingForApprove);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [conditionsPage, setConditionsPage] = useState(1);
  const [conditionsLimit, setConditionsLimit] = useState(DEFAULT_LIMIT);
  const pendingView = view === TriggerStatusTag.PendingForApprove;

  // listTriggers acepta pendientes y no aprobados sin showReferences
  const triggers = useApiQuery((signal) => listTriggers({ limit, page, tagStatus: view }, signal), [limit, page, view]);
  // Mismo tag en las condiciones (GENERIC_STATUS)
  const conditionStatus =
    view === TriggerStatusTag.PendingForApprove
      ? ConditionReviewStatusTag.PendingForApprove
      : ConditionReviewStatusTag.NotApproved;
  const conditions = useApiQuery(
    (signal) => listConditions({ limit: conditionsLimit, page: conditionsPage, tagStatus: conditionStatus }, signal),
    [conditionsLimit, conditionsPage, conditionStatus],
  );

  const triggerReview = useApiMutation(reviewTrigger);
  const conditionReview = useApiMutation(reviewCondition);
  const [reviewing, setReviewing] = useState<ReviewingState | null>(null);
  const [lastReview, setLastReview] = useState<string | null>(null);

  const refetchAll = () => {
    triggers.refetch();
    conditions.refetch();
  };

  const handleTrigger = async (idTrigger: string, name: string, decision: ReviewDecision) => {
    conditionReview.reset();
    setLastReview(null);
    setReviewing({ id: idTrigger, decision });
    const result = await triggerReview.run({ idTrigger, decision });
    setReviewing(null);
    if (result.ok) {
      setLastReview(
        decision === ReviewDecision.Approve
          ? `Trigger "${name}" aprobado: queda Activo y sus condiciones pendientes pasan a Inactivas.`
          : `Trigger "${name}" rechazado: queda No aprobado y el webhook lo ignora.`,
      );
      // Aprobar un trigger tambien cambia el estado de sus condiciones
      refetchAll();
    }
  };

  const handleCondition = async (idCondition: string, name: string, decision: ReviewDecision) => {
    triggerReview.reset();
    setLastReview(null);
    setReviewing({ id: idCondition, decision });
    const result = await conditionReview.run({ idCondition, decision });
    setReviewing(null);
    if (result.ok) {
      setLastReview(
        decision === ReviewDecision.Approve
          ? `Condicion "${name}" aprobada: queda Inactiva y el cronjob empieza a evaluarla.`
          : `Condicion "${name}" rechazada: ningun trigger nuevo o aprobado puede usarla.`,
      );
      conditions.refetch();
    }
  };

  const decisionFor = (id: string) => (reviewing?.id === id ? reviewing.decision : null);
  const conditionList = conditions.data?.conditions ?? [];

  return (
    <main className="page">
      <div className="page__head">
        <div>
          <h1>Revision de agentes</h1>
          <p className="muted small">
            Las condiciones y triggers que crean los agentes nacen pendientes: el cronjob no evalua esas condiciones y el
            webhook ignora esos triggers hasta que los apruebes. Revisa cada corrida en{' '}
            <a href="#/agentes/corridas">Corridas de agentes</a>.
          </p>
        </div>
        <div className="form-actions">
          <span className="segmented" role="group" aria-label="Estado">
            {VIEWS.map((item) => (
              <button
                key={item.tag}
                type="button"
                className="button"
                aria-pressed={view === item.tag}
                onClick={() => {
                  setView(item.tag);
                  setPage(1);
                  setConditionsPage(1);
                  setLastReview(null);
                }}
              >
                {item.label}
              </button>
            ))}
          </span>
          <button
            type="button"
            className="button"
            onClick={refetchAll}
            disabled={triggers.isLoading || triggers.isRefreshing || conditions.isLoading || conditions.isRefreshing}
          >
            Actualizar
          </button>
        </div>
      </div>

      {lastReview && (
        <div className="success-banner" role="status">
          <span>{lastReview}</span>
        </div>
      )}

      <section className="stack" aria-labelledby="review-triggers-title">
        <div className="page__head">
          <div>
            <h2 id="review-triggers-title">Triggers{triggers.data ? ` (${triggers.data.page})` : ''}</h2>
            {pendingView && (
              <p className="muted small">
                Aprobar un trigger tambien aprueba sus condiciones pendientes. No se puede aprobar si usa una condicion
                rechazada. Despliega uno para ver sus condiciones y su codigo Pine.
              </p>
            )}
          </div>
        </div>
        {triggers.error && <ErrorBanner error={triggers.error} onRetry={triggers.refetch} stale={!!triggers.data} />}
        {triggerReview.error && <ErrorBanner error={triggerReview.error} />}
        <div className="panel" aria-busy={triggers.isLoading || triggers.isRefreshing}>
          {triggers.isLoading ? (
            <p className="empty">Cargando triggers…</p>
          ) : (
            triggers.data && (
              <>
                  <TriggersTable
                    triggers={triggers.data.triggers}
                    emptyMessage={pendingView ? 'No hay triggers pendientes de aprobacion.' : 'No hay triggers rechazados.'}
                    detailActions={
                      pendingView
                        ? (trigger) => (
                            <ReviewButtons
                              pendingDecision={decisionFor(trigger.id)}
                              disabled={reviewing !== null}
                              approveHint="Queda Activo y aprueba sus condiciones pendientes"
                              onDecision={(decision) => void handleTrigger(trigger.id, trigger.name, decision)}
                            />
                          )
                        : undefined
                    }
                  />
                  {triggers.data.page > 0 && (
                    <Pagination
                      page={page}
                      limit={limit}
                      total={triggers.data.page}
                      onPageChange={setPage}
                      onLimitChange={(next) => {
                        setLimit(next);
                        setPage(1);
                      }}
                    />
                  )}
              </>
            )
          )}
        </div>
      </section>

      <section className="stack" aria-labelledby="review-conditions-title">
        <div className="page__head">
          <div>
            <h2 id="review-conditions-title">
              Condiciones{conditions.data ? ` (${conditions.data.page})` : ''}
            </h2>
            {pendingView && (
              <p className="muted small">
                Para rechazar una condicion que usa un trigger, rechaza primero el trigger. Aprobada queda Inactiva y el
                cronjob empieza a evaluarla.
              </p>
            )}
          </div>
        </div>
        {conditions.error && (
          <ErrorBanner error={conditions.error} onRetry={conditions.refetch} stale={!!conditions.data} />
        )}
        {conditionReview.error && <ErrorBanner error={conditionReview.error} />}
        <div className="panel" aria-busy={conditions.isLoading || conditions.isRefreshing}>
          {conditions.isLoading ? (
            <p className="empty">Cargando condiciones…</p>
          ) : (
            conditions.data &&
            (conditionList.length === 0 ? (
              <p className="empty">
                {pendingView ? 'No hay condiciones pendientes de aprobacion.' : 'No hay condiciones rechazadas.'}
              </p>
            ) : (
              <>
              <div className="table-wrap">
                <table className="table table--cards">
                  <thead>
                    <tr>
                      <th scope="col">Condicion</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Proveedor</th>
                      <th scope="col">Callback</th>
                      <th scope="col">Cada</th>
                      <th scope="col">Creada</th>
                      <th scope="col">{pendingView ? 'Revision' : 'Estado'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conditionList.map((condition) => (
                      <tr key={condition.id} className="table__row" data-status={condition.tagStatus}>
                        <td className="cell--main">
                          <strong>{condition.name}</strong>
                          {condition.tag && <div className="muted small">{condition.tag}</div>}
                          {condition.description && <div className="muted small">{condition.description}</div>}
                          <div className="tracking copy-row">
                            ID {condition.id}
                            <CopyButton text={condition.id} />
                          </div>
                        </td>
                        <td data-label="Tipo">{condition.nameTypeCondition || '—'}</td>
                        <td data-label="Proveedor">{condition.nameProvider}</td>
                        <td data-label="Callback">
                          <code className="small">{condition.callbackFunction}</code>
                          <CallbackParametersList parameters={condition.parametersCallback} />
                        </td>
                        <td data-label="Cada">
                          {condition.isWebhookOnly
                            ? 'Webhook'
                            : condition.intervalSeconds
                              ? formatDuration(Math.round(condition.intervalSeconds / 60))
                              : '—'}
                        </td>
                        <td data-label="Creada">{formatDateTime(condition.createdDate)}</td>
                        <td className="cell--actions">
                          {pendingView ? (
                            <ReviewButtons
                              pendingDecision={decisionFor(condition.id)}
                              disabled={reviewing !== null}
                              onDecision={(decision) => void handleCondition(condition.id, condition.name, decision)}
                            />
                          ) : (
                            <StatusBadge tag={condition.tagStatus} label={condition.status || condition.tagStatus} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={conditionsPage}
                limit={conditionsLimit}
                total={conditions.data.page}
                onPageChange={setConditionsPage}
                onLimitChange={(next) => {
                  setConditionsLimit(next);
                  setConditionsPage(1);
                }}
              />
              </>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
