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

const DEFAULT_LIMIT = 10;
const COLUMN_COUNT = 7;

// Duracion de la corrida; vacio mientras esta en ejecucion
function runDuration(run: AgentRun): string {
  const start = parseApiDate(run.startedAt);
  const end = parseApiDate(run.finishedAt);
  if (!start || !end) return '';
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
  return minutes === 0 ? 'menos de 1m' : formatDuration(minutes);
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
          Intento {step.attempt} · {formatDateTime(step.createdAt)}
        </span>
        <span className={accepted ? 'run-step__result run-step__result--ok' : 'run-step__result'}>
          {accepted ? 'Aceptada' : `${problems.length} problema${problems.length === 1 ? '' : 's'}`}
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
        <summary>Salida del agente</summary>
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
          <h4>Tesis</h4>
          <p className="thesis-text">{run.thesis}</p>
          <p className="muted small">
            <a href={`#/agentes/corridas?idThesis=${run.idThesis}`}>Todas las corridas de esta tesis</a>
          </p>
        </div>
        <div>
          <h4>Fechas</h4>
          <dl className="kv">
            <dt>Inicio</dt>
            <dd>{formatDateTime(run.startedAt)}</dd>
            <dt>Fin</dt>
            <dd>{run.finishedAt ? formatDateTime(run.finishedAt) : 'en ejecucion'}</dd>
          </dl>
        </div>
        <div>
          <h4>Resultado</h4>
          {created ? (
            <dl className="kv">
              <dt>Condiciones</dt>
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
            <p className="muted">No creo condiciones ni trigger.</p>
          )}
          {created && (
            <p className="small">
              <a href="#/agentes/revision">Revisar lo pendiente</a>
            </p>
          )}
        </div>
      </div>

      {run.error && (
        <div className="error-banner" role="alert">
          <div>
            <strong>Error de la corrida</strong>
            <p className="run-error">{run.error}</p>
          </div>
        </div>
      )}

      <h4>Pasos de los agentes ({steps.length})</h4>
      {steps.length === 0 ? (
        <p className="muted">{run.finishedAt ? 'La corrida no registro pasos.' : 'Los pasos se guardan al terminar la corrida.'}</p>
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
          <h1>Corridas de agentes</h1>
          <p className="muted small">
            Cada corrida procesa una tesis: los intentos de cada agente, los problemas que encontraron las validaciones
            y lo que quedo pendiente de revision.
          </p>
        </div>
        <div className="form-actions">
          <button type="button" className="button" onClick={list.refetch} disabled={list.isLoading || list.isRefreshing}>
            {list.isRefreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
          <a className="button" href="#/agentes/tesis">
            Ver tesis
          </a>
        </div>
      </div>

      {idThesis && (
        <p className="notice copy-row">
          <span>
            Corridas de la tesis <code>{idThesis}</code>
          </span>
          <a className="button button--small" href="#/agentes/corridas">
            Ver todas
          </a>
        </p>
      )}

      <div className="filters">
        <label className="field">
          <span>Estado</span>
          <select
            value={tagStatus}
            onChange={(event) => {
              setTagStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {AGENT_RUN_STATUSES.map((status) => (
              <option key={status.tag} value={status.tag}>
                {status.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--grow">
          <span>Buscar</span>
          <input
            type="search"
            placeholder="Tesis o asset"
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
          <p className="empty">Cargando corridas…</p>
        ) : (
          list.data &&
          (list.data.runs.length === 0 ? (
            <p className="empty">No hay corridas con estos filtros.</p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table--cards">
                  <thead>
                    <tr>
                      <th scope="col" aria-label="Expandir" />
                      <th scope="col">Tesis</th>
                      <th scope="col">Asset</th>
                      <th scope="col">Accion</th>
                      <th scope="col">Estado</th>
                      <th scope="col">Inicio</th>
                      <th scope="col">Resultado</th>
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
                                aria-label={expanded ? 'Ocultar detalle' : 'Ver detalle'}
                                onClick={() => setExpandedId(expanded ? null : run.id)}
                              >
                                {expanded ? '▾' : '▸'}
                              </button>
                            </td>
                            <td className="cell--main">
                              <span className="thesis-text thesis-text--clamp">{run.thesis}</span>
                            </td>
                            <td data-label="Asset">{run.asset || run.tagAsset}</td>
                            <td data-label="Accion">{run.action || run.tagAction}</td>
                            <td data-label="Estado">
                              <StatusBadge tag={run.tagStatus} label={run.status || run.tagStatus} />
                            </td>
                            <td data-label="Inicio">
                              {formatDateTime(run.startedAt)}
                              {duration && <div className="muted small">{duration}</div>}
                            </td>
                            <td data-label="Resultado">
                              {conditions} condicion{conditions === 1 ? '' : 'es'}
                              <div className="muted small">{run.idTrigger ? 'con trigger' : 'sin trigger'}</div>
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
