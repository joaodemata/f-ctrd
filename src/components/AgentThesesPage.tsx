import { useState, type FormEvent } from 'react';
import { createAgentThesis, deleteAgentThesis, listAgentTheses, type CreateAgentThesisBody } from '../api/agents';
import { useApiMutation } from '../hooks/useApiMutation';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { AGENT_THESES_PER_RUN, AGENT_THESIS_STATUSES, AgentThesisStatusTag } from '../models/agent';
import { CatalogType, type Catalog } from '../models/catalog';
import { formatDateTime } from '../utils/format';
import { AssetPicker, type AssetOption } from './AssetPicker';
import { CatalogSelect } from './CatalogSelect';
import { ErrorBanner } from './ErrorBanner';
import { FormField } from './FormField';
import { Pagination } from './Pagination';
import { StatusBadge } from './StatusBadge';

const DEFAULT_LIMIT = 10;
// Limites de CreateAgentThesisFormat.thesis en C-TRD
const THESIS_MIN = 20;
const THESIS_MAX = 2000;

interface ThesisFormValues {
  asset: AssetOption | null;
  action: Pick<Catalog, 'id' | 'tag' | 'name'> | null;
  thesis: string;
}

const EMPTY_FORM: ThesisFormValues = { asset: null, action: null, thesis: '' };

type FieldErrors = Partial<Record<keyof CreateAgentThesisBody, string>>;

function validate(values: ThesisFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.asset) errors.idAsset = 'Elige un asset.';
  if (!values.action) errors.idAction = 'Elige una accion.';
  const length = values.thesis.trim().length;
  if (length < THESIS_MIN) errors.thesis = `La tesis debe tener al menos ${THESIS_MIN} caracteres.`;
  if (length > THESIS_MAX) errors.thesis = `La tesis no puede superar ${THESIS_MAX} caracteres.`;
  return errors;
}

// Cola de tesis de los agentes: el super usuario agrega ideas de inversion y cada viernes la corrida toma las
// AGENT_THESES_PER_RUN pendientes mas antiguas
export function AgentThesesPage() {
  const [values, setValues] = useState<ThesisFormValues>(EMPTY_FORM);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  // Cambia al crear: remonta el selector de assets y refresca el listado
  const [formKey, setFormKey] = useState(0);
  const create = useApiMutation(createAgentThesis);

  const [tagStatus, setTagStatus] = useState<string>(AgentThesisStatusTag.Pending);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const debouncedSearch = useDebouncedValue(search.trim());

  const list = useApiQuery(
    (signal) => listAgentTheses({ limit, page, search: debouncedSearch, tagStatus }, signal),
    [limit, page, debouncedSearch, tagStatus, formKey],
  );

  const remove = useApiMutation(deleteAgentThesis);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const set = <K extends keyof ThesisFormValues>(key: K, value: ThesisFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const fieldError = (field: keyof CreateAgentThesisBody) => clientErrors[field] ?? create.error?.fieldErrors[field];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors = validate(values);
    setClientErrors(errors);
    if (Object.keys(errors).length > 0 || !values.asset || !values.action) return;

    const result = await create.run({
      idAsset: values.asset.id,
      idAction: values.action.id,
      thesis: values.thesis.trim(),
    });
    if (result.ok) {
      setValues(EMPTY_FORM);
      setFormKey((key) => key + 1);
    }
  };

  const handleDelete = async (idThesis: string) => {
    setConfirmDeleteId(null);
    setDeletingId(idThesis);
    const result = await remove.run({ idThesis });
    setDeletingId(null);
    if (result.ok) list.refetch();
  };

  // La posicion en la cola solo tiene sentido en el listado de pendientes sin busqueda (orden FIFO completo)
  const showQueuePosition = tagStatus === AgentThesisStatusTag.Pending && debouncedSearch === '';
  const thesisLength = values.thesis.trim().length;

  return (
    <main className="page">
      <div className="page__head">
        <div>
          <h1>Tesis de agentes</h1>
          <p className="muted small">
            Ideas de inversion para los agentes. Cada viernes la corrida toma las {AGENT_THESES_PER_RUN} pendientes mas
            antiguas y crea condiciones y un trigger que quedan pendientes de tu{' '}
            <a href="#/agentes/revision">revision</a>.
          </p>
        </div>
        <a className="button" href="#/agentes/corridas">
          Ver corridas
        </a>
      </div>

      {create.data && (
        <div className="success-banner" role="status">
          <span>
            <strong>Tesis agregada a la cola.</strong> La procesara la proxima corrida con lugar disponible.
          </span>
        </div>
      )}

      <form className="panel panel--padded form" onSubmit={handleSubmit} noValidate>
        <FormField label="Asset" required as="fieldset" error={fieldError('idAsset')}>
          <AssetPicker
            key={formKey}
            value={values.asset}
            onChange={(asset) => set('asset', asset)}
            invalid={!!fieldError('idAsset')}
          />
        </FormField>
        <FormField label="Accion" required error={fieldError('idAction')}>
          <CatalogSelect
            type={CatalogType.Action}
            value={values.action}
            onChange={(action) => set('action', action)}
            placeholder="Elige una accion"
            invalid={!!fieldError('idAction')}
          />
        </FormField>
        <FormField
          label="Tesis"
          required
          error={fieldError('thesis')}
          hint={`Idea, horizonte y contexto en texto libre. ${thesisLength} / ${THESIS_MAX} caracteres (minimo ${THESIS_MIN}).`}
        >
          <textarea
            value={values.thesis}
            onChange={(event) => set('thesis', event.target.value)}
            rows={5}
            maxLength={THESIS_MAX}
            placeholder="Ej: BTC rebota cuando el RSI diario sale de sobreventa y el miedo del mercado es extremo; horizonte de 2 a 4 semanas."
            aria-invalid={!!fieldError('thesis')}
          />
        </FormField>

        {create.error && <ErrorBanner error={create.error} />}

        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={create.isPending}>
            {create.isPending ? 'Agregando…' : 'Agregar a la cola'}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => {
              setValues(EMPTY_FORM);
              setClientErrors({});
              setFormKey((key) => key + 1);
              create.reset();
            }}
            disabled={create.isPending}
          >
            Limpiar
          </button>
        </div>
      </form>

      <section className="stack" aria-labelledby="theses-title">
        <div className="page__head">
          <h2 id="theses-title">Cola de tesis</h2>
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
                <option value="">Todas</option>
                {AGENT_THESIS_STATUSES.map((status) => (
                  <option key={status.tag} value={status.tag}>
                    {status.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
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
        </div>

        {list.error && <ErrorBanner error={list.error} onRetry={list.refetch} stale={!!list.data} />}
        {remove.error && <ErrorBanner error={remove.error} />}

        <div className="panel" aria-busy={list.isLoading || list.isRefreshing}>
          {list.isLoading ? (
            <p className="empty">Cargando tesis…</p>
          ) : (
            list.data &&
            (list.data.theses.length === 0 ? (
              <p className="empty">No hay tesis con estos filtros.</p>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="table table--cards">
                    <thead>
                      <tr>
                        {showQueuePosition && (
                          <th scope="col" className="num">
                            #
                          </th>
                        )}
                        <th scope="col">Tesis</th>
                        <th scope="col">Asset</th>
                        <th scope="col">Accion</th>
                        <th scope="col">Estado</th>
                        <th scope="col">Creada</th>
                        <th scope="col">Tomada</th>
                        <th scope="col" aria-label="Acciones" />
                      </tr>
                    </thead>
                    <tbody>
                      {list.data.theses.map((thesis, index) => {
                        const position = (page - 1) * limit + index + 1;
                        const pending = thesis.tagStatus === AgentThesisStatusTag.Pending;
                        return (
                          <tr key={thesis.id} className="table__row" data-status={thesis.tagStatus}>
                            {showQueuePosition && (
                              <td className="num" data-label="Posicion">
                                {position}
                                {position <= AGENT_THESES_PER_RUN && (
                                  <div className="muted small">proxima corrida</div>
                                )}
                              </td>
                            )}
                            <td className="cell--main">
                              <span className="thesis-text">{thesis.thesis}</span>
                            </td>
                            <td data-label="Asset">{thesis.asset || thesis.tagAsset}</td>
                            <td data-label="Accion">{thesis.action || thesis.tagAction}</td>
                            <td data-label="Estado">
                              <StatusBadge tag={thesis.tagStatus} label={thesis.status || thesis.tagStatus} />
                            </td>
                            <td data-label="Creada">{formatDateTime(thesis.createdDate)}</td>
                            <td data-label="Tomada">{formatDateTime(thesis.claimedAt)}</td>
                            <td className="cell--actions">
                              {pending && confirmDeleteId === thesis.id ? (
                                <span className="review-buttons">
                                  <button
                                    type="button"
                                    className="button button--danger button--small"
                                    onClick={() => void handleDelete(thesis.id)}
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    type="button"
                                    className="button button--ghost button--small"
                                    onClick={() => setConfirmDeleteId(null)}
                                  >
                                    Cancelar
                                  </button>
                                </span>
                              ) : (
                                <span className="review-buttons">
                                  {!pending && (
                                    <a
                                      className="button button--small"
                                      href={`#/agentes/corridas?idThesis=${thesis.id}`}
                                    >
                                      Corridas
                                    </a>
                                  )}
                                  {pending && (
                                    <button
                                      type="button"
                                      className="button button--small"
                                      onClick={() => setConfirmDeleteId(thesis.id)}
                                      disabled={deletingId !== null}
                                    >
                                      {deletingId === thesis.id ? 'Borrando…' : 'Borrar'}
                                    </button>
                                  )}
                                </span>
                              )}
                            </td>
                          </tr>
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
        </div>
      </section>
    </main>
  );
}
