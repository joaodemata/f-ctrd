import { useCallback, useState } from 'react';
import { pollIntervalMs } from '../api/config';
import { ServerEventType } from '../api/events';
import { listOpportunities } from '../api/opportunities';
import type { ApiMeta, ApiResult } from '../api/types';
import { useApiQuery } from '../hooks/useApiQuery';
import { useAuth } from '../hooks/useAuth';
import { useServerEvent } from '../hooks/useServerEvent';
import { OPPORTUNITY_STATUSES, type OpportunityStatusInfo } from '../models/opportunity';
import { escapeRegex } from '../utils/format';
import { EconomicCalendarPanel } from './EconomicCalendarPanel';
import { ErrorBanner } from './ErrorBanner';
import { Filters, type FilterValues } from './Filters';
import { InfoPopover } from './InfoPopover';
import { MarketMoversBanner } from './MarketMoversBanner';
import { OpportunitiesTable } from './OpportunitiesTable';
import { Pagination } from './Pagination';
import { StatusSummary } from './StatusSummary';

const DEFAULT_LIMIT = 10;
const EMPTY_FILTERS: FilterValues = { search: '', startDate: '', endDate: '' };

type StatusCounts = Partial<Record<string, number>>;

export function Dashboard() {
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [status, setStatus] = useState<OpportunityStatusInfo | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const invalidRange = filters.startDate !== '' && filters.endDate !== '' && filters.startDate > filters.endDate;
  const dateRange = invalidRange ? {} : { startDate: filters.startDate, endDate: filters.endDate };

  // El backend solo tiene un search (regex sobre asset, action, status y tag_trigger): el filtro
  // por estado usa el nombre del estado y tiene prioridad sobre el texto libre
  const search = status ? `^${escapeRegex(status.name)}$` : escapeRegex(filters.search.trim());

  // C-TRD filtra por visibilidad segun la sesion: sin sesion solo las publicas; con sesion tambien las del usuario y
  // las de lista privada donde esta. Al iniciar o cerrar sesion se vuelve a pedir; el estado cuenta porque un token
  // vencido falla la primera consulta (401) y la sesion pasa de 'checking' a 'anonymous' sin haber tenido usuario
  const auth = useAuth();
  const sessionKey = auth.user?.id ?? auth.status;

  // C-TRD avisa por websocket cuando cambian las oportunidades (agrupa los cambios en ventanas de 5 s). Mientras el
  // websocket esta caido se vuelve al polling, y al reconectar se recarga una vez por los eventos perdidos
  const refreshAll = () => {
    list.refetch();
    counts.refetch();
  };
  const live = useServerEvent(ServerEventType.OpportunitiesUpdated, () => refreshAll());
  const fallbackPollMs = live ? 0 : pollIntervalMs;

  const list = useApiQuery(
    (signal) => listOpportunities({ limit, page, search, ...dateRange }, signal),
    [limit, page, search, dateRange.startDate, dateRange.endDate, sessionKey],
    { pollIntervalMs: fallbackPollMs },
  );

  // Totales por estado: una consulta con limit=1 por estado, usando solo el campo page (total)
  const counts = useApiQuery(
    async (signal): Promise<ApiResult<StatusCounts>> => {
      const results = await Promise.all(
        OPPORTUNITY_STATUSES.map(async (info) => ({
          tag: info.tag,
          result: await listOpportunities({ limit: 1, search: `^${escapeRegex(info.name)}$`, ...dateRange }, signal),
        })),
      );
      const totals: StatusCounts = {};
      let meta: ApiMeta = { httpStatus: 200, message: 'Totales por estado', tracking: '', date: new Date().toISOString() };
      for (const { tag, result } of results) {
        if (!result.ok) return result;
        totals[tag] = result.data.page;
        meta = result.meta;
      }
      return { ok: true, data: totals, meta };
    },
    [dateRange.startDate, dateRange.endDate, sessionKey],
    { pollIntervalMs: fallbackPollMs },
  );

  const allTotal = counts.data
    ? OPPORTUNITY_STATUSES.reduce((sum, info) => sum + (counts.data?.[info.tag] ?? 0), 0)
    : undefined;

  const handleFilters = useCallback((next: FilterValues) => {
    setFilters(next);
    if (next.search !== '') setStatus(null);
    setPage(1);
  }, []);

  const handleStatus = (next: OpportunityStatusInfo | null) => {
    setStatus(next);
    setPage(1);
  };

  return (
    <main className="dashboard">
      {/* Titulo con el estado en vivo; las notas van dentro del boton "i" para no ocupar lineas */}
      <div className="dashboard__head dashboard__title">
        <h1>Oportunidades</h1>
        {live && (
          <span className="live-badge" title="Se actualiza sola cuando cambian las oportunidades">
            En vivo
          </span>
        )}
        <InfoPopover label="Informacion sobre las oportunidades">
          <p>{list.lastUpdated ? `Actualizado a las ${list.lastUpdated.toLocaleTimeString('es')}.` : 'Cargando…'}</p>
          <p>Todos los precios estan expresados en USD.</p>
          {auth.status === 'anonymous' && (
            <p>
              Sin sesion solo ves las oportunidades publicas. <a href="#/login">Inicia sesion</a> para ver tambien las
              tuyas y las compartidas contigo.
            </p>
          )}
        </InfoPopover>
      </div>

      <MarketMoversBanner />

      <div className="dashboard__layout">
        <div className="dashboard__main">
          <StatusSummary counts={counts.data} total={allTotal} selected={status?.tag ?? null} onSelect={handleStatus} />
          {counts.error && !list.error && <ErrorBanner error={counts.error} onRetry={counts.refetch} stale={!!counts.data} />}

          <Filters value={filters} onChange={handleFilters} />
          {status && (
            <p className="muted small">
              Filtrando por estado <strong>{status.name}</strong>; el texto de busqueda se ignora mientras el estado este
              seleccionado.
            </p>
          )}

          {list.error && <ErrorBanner error={list.error} onRetry={list.refetch} stale={!!list.data} />}

          <section className="panel" aria-busy={list.isLoading || list.isRefreshing}>
            {list.isLoading ? (
              <p className="empty">Cargando oportunidades…</p>
            ) : (
              list.data && (
                <>
                  <OpportunitiesTable opportunities={list.data.opportunities} />
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
              )
            )}
          </section>
        </div>

        <EconomicCalendarPanel />
      </div>
    </main>
  );
}
