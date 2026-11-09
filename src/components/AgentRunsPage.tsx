import { Fragment, useEffect, useState } from 'react';
import { listAgentRuns } from '../api/agents';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useHashParams } from '../hooks/useHashRoute';
import { AGENT_RUN_STATUSES, agentLabel, type AgentRun, type AgentRunStep } from '../models/agent';
import { formatDateTime, formatDuration, parseApiDate } from '../utils/format';
import { CopyButton } from './CopyButton';
import { ErrorBanner } from './ErrorBanner';
import { Pagination } from './Pagination';
import { StatusBadge } from './StatusBadge';
import { t } from '../i18n/language';

const DEFAULT_LIMIT = 10;
const COLUMN_COUNT = 7;

// Duracion de la corrida; vacio mientras esta en ejecucion
function runDuration(run: AgentRun): string {
  const start = parseApiDate(run.startedAt);
  const end = parseApiDate(run.finishedAt);
  if (!start || !end) return '';
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
  return minutes === 0 ? t('menos de 1m', 'under 1m') : formatDuration(minutes);
}

function StepItem({ step }: { step: AgentRunStep }) {
  const problems = step.problems ?? [];
  const accepted = problems.length === 0;
  const output = JSON.stringify(step.output ?? {}, null, 2);

  return (
    <li className="run-step" data-accepted={accepted}>
      <div className="run-step__head">
        <strong>{agentLabel(step.agent)}</strong>
        <span className="muted small">
          {t('Intento', 'Attempt')} {step.attempt} · {formatDateTime(step.createdAt)}
        </span>
        <span className={accepted ? 'run-step__result run-step__result--ok' : 'run-step__result'}>
          {accepted
            ? t('Aceptada', 'Accepted')
            : t(
                `${problems.length} problema${problems.length === 1 ? '' : 's'}`,
                `${problems.length} problem${problems.length === 1 ? '' : 's'}`,
              )}
        </span>
      </div>
      {!accepted && (
        <ul className="run-step__problems">
          {problems.map((problem, index) => (
            <li key={index}>{problem}</li>
          ))}
        </ul>
      )}
      <details className="run-step__output">
        <summary>{t('Salida del agente', 'Agent output')}</summary>
        <div className="copy-row">
          <CopyButton text={output} />
        </div>
        <pre className="code-block">{output}</pre>
      </details>
    </li>
  );
}

function RunDetail({ run }: { run: AgentRun }) {
  const steps = run.steps ?? [];
  const conditions = run.idConditions ?? [];
  const created = conditions.length > 0 || run.idTrigger !== null;

  return (
    <div className="detail">
      <div className="detail__grid">
        <div>
          <h4>{t('Tesis', 'Thesis')}</h4>
          <p className="thesis-text">{run.thesis}</p>
          <p className="muted small">
            <a href={`#/agentes/corridas?idThesis=${run.idThesis}`}>{t('Todas las corridas de esta tesis', 'All runs of this thesis')}</a>
          </p>
        </div>
        <div>
          <h4>{t('Fechas', 'Dates')}</h4>
          <dl className="kv">
            <dt>{t('Inicio', 'Start')}</dt>
            <dd>{formatDateTime(run.startedAt)}</dd>
            <dt>{t('Fin', 'End')}</dt>
            <dd>{run.finishedAt ? formatDateTime(run.finishedAt) : t('en ejecucion', 'running')}</dd>
          </dl>
        </div>
        <div>
          <h4>{t('Resultado', 'Result')}</h4>
          {created ? (
            <dl className="kv">
              <dt>{t('Condiciones', 'Conditions')}</dt>
              <dd>
                {conditions.length === 0
                  ? '—'
                  : conditions.map((id) => (
                      <code key={id} className="small record-access__user">
                        {id}
                      </code>
                    ))}
              </dd>
              <dt>Trigger</dt>
              <dd>{run.idTrigger ? <code className="small">{run.idTrigger}</code> : '—'}</dd>
            </dl>
          ) : (
            <p className="muted">{t('No creo condiciones ni trigger.', 'It created no conditions or trigger.')}</p>
          )}
          {created && (
            <p className="small">
              <a href="#/agentes/revision">{t('Revisar lo pendiente', 'Review what is pending')}</a>
            </p>
          )}
        </div>
      </div>

      {run.error && (
        <div className="error-banner" role="alert">
          <div>
            <strong>{t('Error de la corrida', 'Run error')}</strong>
            <p className="run-error">{run.error}</p>
          </div>
        </div>
      )}

      <h4>
        {t('Pasos de los agentes', 'Agent steps')} ({steps.length})
      </h4>
      {steps.length === 0 ? (
        <p className="muted">
          {run.finishedAt
            ? t('La corrida no registro pasos.', 'The run recorded no steps.')
            : t('Los pasos se guardan al terminar la corrida.', 'Steps are saved when the run finishes.')}
        </p>
      ) : (
        <ol className="run-steps">
          {steps.map((step, index) => (
            <StepItem key={index} step={step} />
          ))}
        </ol>
      )}

      <p className="tracking copy-row">
        ID {run.id}
        <CopyButton text={run.id} />
      </p>
    </div>
  );
}

// Corridas de los agentes, las mas recientes primero. Con ?idThesis= solo las de una tesis
export function AgentRunsPage() {
  const idThesis = useHashParams().get('idThesis') ?? '';
  const [tagStatus, setTagStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim());

  // Cambiar de tesis desde un enlace no remonta la pagina (misma ruta): vuelve a la primera pagina
  useEffect(() => setPage(1), [idThesis]);

  const list = useApiQuery(
    (signal) => listAgentRuns({ limit, page, search: debouncedSearch, tagStatus, idThesis }, signal),
    [limit, page, debouncedSearch, tagStatus, idThesis],
  );

  return (
    <main className="page">
      <div className="page__head">
        <div>
          <h1>{t('Corridas de agentes', 'Agent runs')}</h1>
          <p className="muted small">
            {t(
              'Cada corrida procesa una tesis: los intentos de cada agente, los problemas que encontraron las validaciones y lo que quedo pendiente de revision.',
              'Each run processes one thesis: the attempts of each agent, the problems the validations found and what was left pending review.',
            )}
          </p>
        </div>
        <div className="form-actions">
          <button type="button" className="button" onClick={list.refetch} disabled={list.isLoading || list.isRefreshing}>
            {list.isRefreshing ? t('Actualizando…', 'Refreshing…') : t('Actualizar', 'Refresh')}
          </button>
          <a className="button" href="#/agentes/tesis">
            {t('Ver tesis', 'See theses')}
          </a>
        </div>
      </div>

      {idThesis && (
        <p className="notice copy-row">
          <span>
            {t('Corridas de la tesis', 'Runs of thesis')} <code>{idThesis}</code>
          </span>
          <a className="button button--small" href="#/agentes/corridas">
            {t('Ver todas', 'See all')}
          </a>
        </p>
      )}

      <div className="filters">
        <label className="field">
          <span>{t('Estado', 'Status')}</span>
          <select
            value={tagStatus}
            onChange={(event) => {
              setTagStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('Todos', 'All')}</option>
            {AGENT_RUN_STATUSES.map((status) => (
              <option key={status.tag} value={status.tag}>
                {t(status.label)}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--grow">
          <span>{t('Buscar', 'Search')}</span>
          <input
            type="search"
            placeholder={t('Tesis o asset', 'Thesis or asset')}
            value={search}
            maxLength={100}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>

      {list.error && <ErrorBanner error={list.error} onRetry={list.refetch} stale={!!list.data} />}

      <section className="panel" aria-busy={list.isLoading || list.isRefreshing}>
        {list.isLoading ? (
          <p className="empty">{t('Cargando corridas…', 'Loading runs…')}</p>
        ) : (
          list.data &&
          (list.data.runs.length === 0 ? (
            <p className="empty">{t('No hay corridas con estos filtros.', 'No runs match these filters.')}</p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table--cards">
                  <thead>
                    <tr>
                      <th scope="col" aria-label={t('Expandir', 'Expand')} />
                      <th scope="col">{t('Tesis', 'Thesis')}</th>
                      <th scope="col">Asset</th>
                      <th scope="col">{t('Accion', 'Action')}</th>
                      <th scope="col">{t('Estado', 'Status')}</th>
                      <th scope="col">{t('Inicio', 'Start')}</th>
                      <th scope="col">{t('Resultado', 'Result')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.runs.map((run) => {
                      const expanded = expandedId === run.id;
                      const conditions = run.idConditions?.length ?? 0;
                      const duration = runDuration(run);
                      return (
                        <Fragment key={run.id}>
                          <tr className="table__row" data-status={run.tagStatus} data-expanded={expanded}>
                            <td className="cell--toggle">
                              <button
                                type="button"
                                className="icon-button"
                                aria-expanded={expanded}
                                aria-label={expanded ? t('Ocultar detalle', 'Hide details') : t('Ver detalle', 'Show details')}
                                onClick={() => setExpandedId(expanded ? null : run.id)}
                              >
                                {expanded ? '▾' : '▸'}
                              </button>
                            </td>
                            <td className="cell--main">
                              <span className="thesis-text thesis-text--clamp">{run.thesis}</span>
                            </td>
                            <td data-label="Asset">{run.asset || run.tagAsset}</td>
                            <td data-label={t('Accion', 'Action')}>{run.action || run.tagAction}</td>
                            <td data-label={t('Estado', 'Status')}>
                              <StatusBadge tag={run.tagStatus} label={run.status || run.tagStatus} />
                            </td>
                            <td data-label={t('Inicio', 'Start')}>
                              {formatDateTime(run.startedAt)}
                              {duration && <div className="muted small">{duration}</div>}
                            </td>
                            <td data-label={t('Resultado', 'Result')}>
                              {conditions}{' '}
                              {conditions === 1 ? t('condicion', 'condition') : t('condiciones', 'conditions')}
                              <div className="muted small">
                                {run.idTrigger ? t('con trigger', 'with trigger') : t('sin trigger', 'no trigger')}
                              </div>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="table__detail" data-status={run.tagStatus}>
                              <td colSpan={COLUMN_COUNT}>
                                <RunDetail run={run} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                limit={limit}
                total={list.data.page}
                onPageChange={setPage}
                onLimitChange={(next) => {
                  setLimit(next);
                  setPage(1);
                }}
              />
            </>
          ))
        )}
      </section>
    </main>
  );
}
