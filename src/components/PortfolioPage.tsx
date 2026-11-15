import { useMemo, useState } from 'react';
import { deletePortfolio, getPortfolioRoi, listPortfolios } from '../api/portfolios';
import { useApiMutation } from '../hooks/useApiMutation';
import { useApiQuery } from '../hooks/useApiQuery';
import { useAuth } from '../hooks/useAuth';
import { useHashParams } from '../hooks/useHashRoute';
import { PHONE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { t } from '../i18n/language';
import { OPPORTUNITY_STATUSES } from '../models/opportunity';
import { TransactionTypeTag, type Portfolio, type PortfolioRoi, type PortfolioTransaction } from '../models/portfolio';
import {
  formatDateTime,
  formatMoney,
  formatPrice,
  formatQuantity,
  formatSignedMoney,
  formatSignedPercent,
  pnlTone,
} from '../utils/format';
import { ErrorBanner } from './ErrorBanner';
import { FormDialog } from './FormDialog';
import { PortfolioForm } from './PortfolioForm';
import { PortfolioTransactions } from './PortfolioTransactions';
import { StatusBadge } from './StatusBadge';
import { TransactionForm, type TransactionPreset } from './TransactionForm';

// /list/portfolios pagina; un usuario tiene pocos portfolios y el selector los muestra todos (100 es el maximo)
const PORTFOLIOS_LIMIT = 100;

// El ROI solo trae el tag del estado; StatusBadge espera el nombre de C-TRD
function opportunityStatusName(tag: string): string {
  return OPPORTUNITY_STATUSES.find((status) => status.tag === tag)?.name ?? tag;
}

function selectPortfolio(id: string) {
  window.location.hash = `#/portafolio?id=${encodeURIComponent(id)}`;
}

// Portafolios del usuario de la sesion: selector, ROI con precios de mercado, posiciones, ROI por oportunidad y
// transacciones. El portfolio elegido va en la ruta (#/portafolio?id=...); sin id se muestra el primero
export function PortfolioPage() {
  const auth = useAuth();
  const params = useHashParams();
  const isPhone = useMediaQuery(PHONE_QUERY);

  const portfolios = useApiQuery(
    (signal) => listPortfolios({ limit: PORTFOLIOS_LIMIT }, signal),
    [auth.user?.id],
  );
  const [portfolioDialog, setPortfolioDialog] = useState<'create' | 'edit' | null>(null);

  const list = portfolios.data?.portfolios ?? [];
  const requestedId = params.get('id');
  const selected = list.find((item) => item.id === requestedId) ?? list[0];

  return (
    <main className="page">
      <div className="page__head">
        <div>
          <h1>{t('Portafolio', 'Portfolio')}</h1>
          <p className="muted small">
            {t(
              'Registra tus compras, ventas, dividendos y movimientos de efectivo para seguir tus posiciones y su rendimiento con precios de mercado.',
              'Record your buys, sells, dividends and cash movements to track your positions and their return at market prices.',
            )}
          </p>
        </div>
        {list.length > 0 && (
          <button type="button" className="button" onClick={() => setPortfolioDialog('create')}>
            {t('Nuevo portafolio', 'New portfolio')}
          </button>
        )}
      </div>

      {portfolios.error && <ErrorBanner error={portfolios.error} onRetry={portfolios.refetch} stale={!!portfolios.data} />}

      {portfolios.isLoading ? (
        <div className="panel">
          <p className="empty">{t('Cargando portafolios…', 'Loading portfolios…')}</p>
        </div>
      ) : (
        portfolios.data &&
        (list.length === 0 ? (
          <section className="panel panel--padded portfolio-empty">
            <h2>{t('Todavia no tienes portafolios', 'You have no portfolios yet')}</h2>
            <p className="muted">
              {t(
                'Crea uno y registra un deposito para empezar; luego agrega tus compras y ventas.',
                'Create one and record a deposit to start; then add your buys and sells.',
              )}
            </p>
            <div className="form-actions">
              <button type="button" className="button button--primary" onClick={() => setPortfolioDialog('create')}>
                {t('Crear portafolio', 'Create portfolio')}
              </button>
            </div>
          </section>
        ) : (
          <>
            {list.length > 1 &&
              (isPhone ? (
                <label className="field">
                  <span>{t('Portafolio', 'Portfolio')}</span>
                  <select value={selected?.id ?? ''} onChange={(event) => selectPortfolio(event.target.value)}>
                    {list.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.tag})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="chip-group" role="group" aria-label={t('Portafolio', 'Portfolio')}>
                  {list.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="button button--small"
                      aria-pressed={item.id === selected?.id}
                      onClick={() => selectPortfolio(item.id)}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              ))}
            {selected && (
              <PortfolioDetail
                key={selected.id}
                portfolio={selected}
                onEdit={() => setPortfolioDialog('edit')}
                onDeleted={() => {
                  const next = list.find((item) => item.id !== selected.id);
                  if (next) selectPortfolio(next.id);
                  else window.location.hash = '#/portafolio';
                  portfolios.refetch();
                }}
              />
            )}
          </>
        ))
      )}

      <FormDialog
        open={portfolioDialog !== null}
        title={portfolioDialog === 'edit' ? t('Editar portafolio', 'Edit portfolio') : t('Nuevo portafolio', 'New portfolio')}
        onClose={() => setPortfolioDialog(null)}
      >
        <PortfolioForm
          portfolio={portfolioDialog === 'edit' ? selected : undefined}
          onCancel={() => setPortfolioDialog(null)}
          onSaved={(idPortfolio) => {
            setPortfolioDialog(null);
            selectPortfolio(idPortfolio);
            portfolios.refetch();
          }}
        />
      </FormDialog>
    </main>
  );
}

interface PortfolioDetailProps {
  portfolio: Portfolio;
  onEdit: () => void;
  onDeleted: () => void;
}

type TransactionDialog = { mode: 'create'; preset?: TransactionPreset } | { mode: 'edit'; transaction: PortfolioTransaction };

function PortfolioDetail({ portfolio, onEdit, onDeleted }: PortfolioDetailProps) {
  // roiKey refresca el ROI (y con el los precios); transactionsKey el historial
  const [roiKey, setRoiKey] = useState(0);
  const [transactionsKey, setTransactionsKey] = useState(0);
  const roi = useApiQuery((signal) => getPortfolioRoi(portfolio.id, signal), [portfolio.id, roiKey]);
  const [dialog, setDialog] = useState<TransactionDialog | null>(null);

  const remove = useApiMutation(deletePortfolio);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const opportunityLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const item of roi.data?.roi.opportunities ?? []) {
      if (item.tagTrigger) labels.set(item.idOpportunity, item.tagTrigger);
    }
    return labels;
  }, [roi.data]);

  const handleDelete = async () => {
    setConfirmDelete(false);
    const result = await remove.run({ idPortfolio: portfolio.id });
    if (result.ok) onDeleted();
  };

  return (
    <>
      <section className="panel panel--padded portfolio-head">
        <div className="portfolio-head__info">
          <h2>
            {portfolio.name} <span className="muted small portfolio-head__tag">{portfolio.tag}</span>
          </h2>
          {portfolio.description && <p className="muted small">{portfolio.description}</p>}
        </div>
        <div className="form-actions portfolio-head__actions">
          <button type="button" className="button button--primary" onClick={() => setDialog({ mode: 'create' })}>
            {t('Registrar transaccion', 'Record transaction')}
          </button>
          <button type="button" className="button" onClick={onEdit}>
            {t('Editar', 'Edit')}
          </button>
          {confirmDelete ? (
            <>
              <button type="button" className="button button--danger" onClick={() => void handleDelete()}>
                {t('Borrar con sus transacciones', 'Delete with its transactions')}
              </button>
              <button type="button" className="button button--ghost" onClick={() => setConfirmDelete(false)}>
                {t('Cancelar', 'Cancel')}
              </button>
            </>
          ) : (
            <button type="button" className="button" onClick={() => setConfirmDelete(true)} disabled={remove.isPending}>
              {remove.isPending ? t('Borrando…', 'Deleting…') : t('Borrar', 'Delete')}
            </button>
          )}
        </div>
        {remove.error && <ErrorBanner error={remove.error} />}
      </section>

      {roi.error && <ErrorBanner error={roi.error} onRetry={roi.refetch} stale={!!roi.data} />}
      {roi.isLoading ? (
        <div className="panel">
          <p className="empty">{t('Calculando el rendimiento…', 'Calculating the return…')}</p>
        </div>
      ) : (
        roi.data && (
          <RoiSections
            roi={roi.data.roi}
            refreshing={roi.isRefreshing}
            onRefresh={roi.refetch}
            onTrade={(preset) => setDialog({ mode: 'create', preset })}
          />
        )
      )}

      <PortfolioTransactions
        idPortfolio={portfolio.id}
        reloadKey={transactionsKey}
        opportunityLabels={opportunityLabels}
        onEdit={(transaction) => setDialog({ mode: 'edit', transaction })}
        onDeleted={() => setRoiKey((key) => key + 1)}
      />

      <FormDialog
        open={dialog !== null}
        title={dialog?.mode === 'edit' ? t('Editar transaccion', 'Edit transaction') : t('Registrar transaccion', 'Record transaction')}
        onClose={() => setDialog(null)}
      >
        {dialog && (
          <TransactionForm
            // Remonta el formulario al abrirlo con otra transaccion o preset
            key={dialog.mode === 'edit' ? dialog.transaction.id : `new:${dialog.preset?.tag ?? ''}:${dialog.preset?.asset.id ?? ''}`}
            idPortfolio={portfolio.id}
            transaction={dialog.mode === 'edit' ? dialog.transaction : undefined}
            preset={dialog.mode === 'create' ? dialog.preset : undefined}
            onCancel={() => setDialog(null)}
            onSaved={() => {
              setDialog(null);
              setRoiKey((key) => key + 1);
              setTransactionsKey((key) => key + 1);
            }}
          />
        )}
      </FormDialog>
    </>
  );
}

interface RoiSectionsProps {
  roi: PortfolioRoi;
  refreshing: boolean;
  onRefresh: () => void;
  onTrade: (preset: TransactionPreset) => void;
}

interface Metric {
  label: string;
  value: string;
  tone?: 'up' | 'down';
  hint?: string;
}

function RoiSections({ roi, refreshing, onRefresh, onTrade }: RoiSectionsProps) {
  const { totals } = roi;
  const metrics: Metric[] = [
    {
      label: t('Patrimonio', 'Equity'),
      value: formatMoney(totals.equity),
      hint: t('Efectivo + valor de mercado', 'Cash + market value'),
    },
    { label: t('Valor de mercado', 'Market value'), value: formatMoney(totals.marketValue) },
    { label: t('Efectivo', 'Cash'), value: formatMoney(totals.cash), tone: totals.cash < 0 ? 'down' : undefined },
    { label: t('Depositos netos', 'Net deposits'), value: formatMoney(totals.netDeposits) },
    { label: t('G/P realizada', 'Realized P/L'), value: formatSignedMoney(totals.realizedPnl), tone: pnlTone(totals.realizedPnl) },
    {
      label: t('G/P no realizada', 'Unrealized P/L'),
      value: formatSignedMoney(totals.unrealizedPnl),
      tone: pnlTone(totals.unrealizedPnl),
    },
    {
      label: t('ROI sobre lo invertido', 'ROI on invested'),
      value: formatSignedPercent(totals.roiOnInvested),
      tone: pnlTone(totals.roiOnInvested),
      hint: t(`Invertido: ${formatMoney(totals.investedCost)}`, `Invested: ${formatMoney(totals.investedCost)}`),
    },
    {
      label: t('ROI sobre el patrimonio', 'ROI on equity'),
      value: formatSignedPercent(totals.roiOnEquity),
      tone: pnlTone(totals.roiOnEquity),
      hint: t('Contra los depositos netos', 'Against net deposits'),
    },
  ];

  // Posiciones abiertas primero; las cerradas (cantidad 0) solo aportan ganancia realizada
  const assets = [...roi.assets].sort((a, b) => Number(b.quantity > 0) - Number(a.quantity > 0));

  return (
    <>
      <section className="stack" aria-labelledby="roi-title" aria-busy={refreshing}>
        <div className="page__head">
          <h2 id="roi-title">{t('Rendimiento', 'Performance')}</h2>
          <div className="portfolio-roi__meta">
            <span className="muted small">
              {t('Calculado', 'Calculated')} {formatDateTime(roi.calculatedAt)}
            </span>
            <button type="button" className="button button--small" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? t('Actualizando…', 'Refreshing…') : t('Actualizar precios', 'Refresh prices')}
            </button>
          </div>
        </div>
        {roi.warnings.length > 0 && (
          <div className="notice" role="status">
            <ul className="plain-list">
              {roi.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="summary summary--metrics">
          {metrics.map((metric) => (
            <div key={metric.label} className="summary__card summary__card--static" data-tone={metric.tone}>
              <span className="summary__label">{metric.label}</span>
              <span className="summary__value">{metric.value}</span>
              {metric.hint && <span className="summary__hint">{metric.hint}</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="stack" aria-labelledby="positions-title">
        <h2 id="positions-title">{t('Posiciones', 'Positions')}</h2>
        <div className="panel">
          {assets.length === 0 ? (
            <p className="empty">
              {t('Sin posiciones: registra una compra para abrir una.', 'No positions: record a buy to open one.')}
            </p>
          ) : (
            <div className="table-wrap">
              <table className="table table--cards">
                <thead>
                  <tr>
                    <th scope="col">Asset</th>
                    <th scope="col" className="num">
                      {t('Cantidad', 'Quantity')}
                    </th>
                    <th scope="col" className="num">
                      {t('Costo promedio', 'Average cost')}
                    </th>
                    <th scope="col" className="num">
                      {t('Precio actual', 'Market price')}
                    </th>
                    <th scope="col" className="num">
                      {t('Costo', 'Cost basis')}
                    </th>
                    <th scope="col" className="num">
                      {t('Valor de mercado', 'Market value')}
                    </th>
                    <th scope="col" className="num">
                      {t('G/P no realizada', 'Unrealized P/L')}
                    </th>
                    <th scope="col" className="num">
                      {t('G/P realizada', 'Realized P/L')}
                    </th>
                    <th scope="col" aria-label={t('Acciones', 'Actions')} />
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const open = asset.quantity > 0;
                    const option = { id: asset.idAsset, tag: asset.tagAsset, name: asset.nameAsset, typeName: asset.typeNameAsset };
                    const unrealizedPct =
                      asset.unrealizedPnl !== null && asset.costBasis > 0 ? asset.unrealizedPnl / asset.costBasis : null;
                    return (
                      <tr key={asset.idAsset} className="table__row" data-closed={!open}>
                        <td className="cell--main">
                          <strong>{asset.tagAsset}</strong> <span className="muted small">{asset.nameAsset}</span>
                          {!open && <span className="muted small"> · {t('cerrada', 'closed')}</span>}
                        </td>
                        <td className="num" data-label={t('Cantidad', 'Quantity')}>
                          {formatQuantity(asset.quantity)}
                        </td>
                        <td className="num" data-label={t('Costo promedio', 'Average cost')}>
                          {open ? formatPrice(asset.averageCost) : '—'}
                        </td>
                        <td className="num" data-label={t('Precio actual', 'Market price')}>
                          {open ? (asset.marketPrice === null ? t('sin precio', 'no price') : formatPrice(asset.marketPrice)) : '—'}
                        </td>
                        <td className="num" data-label={t('Costo', 'Cost basis')}>
                          {open ? formatMoney(asset.costBasis) : '—'}
                        </td>
                        <td className="num" data-label={t('Valor de mercado', 'Market value')}>
                          {open ? formatMoney(asset.marketValue) : '—'}
                        </td>
                        <td className="num" data-label={t('G/P no realizada', 'Unrealized P/L')}>
                          {open ? (
                            <span className="pnl" data-tone={pnlTone(asset.unrealizedPnl)}>
                              {formatSignedMoney(asset.unrealizedPnl)}
                              {unrealizedPct !== null && <span className="small"> ({formatSignedPercent(unrealizedPct)})</span>}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="num" data-label={t('G/P realizada', 'Realized P/L')}>
                          <span className="pnl" data-tone={pnlTone(asset.realizedPnl)}>
                            {formatSignedMoney(asset.realizedPnl)}
                          </span>
                        </td>
                        <td className="cell--actions">
                          <span className="review-buttons">
                            <button
                              type="button"
                              className="button button--small"
                              onClick={() => onTrade({ tag: TransactionTypeTag.Buy, asset: option })}
                            >
                              {t('Comprar', 'Buy')}
                            </button>
                            {open && (
                              <button
                                type="button"
                                className="button button--small"
                                onClick={() => onTrade({ tag: TransactionTypeTag.Sell, asset: option })}
                              >
                                {t('Vender', 'Sell')}
                              </button>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {roi.opportunities.length > 0 && (
        <section className="stack" aria-labelledby="opportunities-roi-title">
          <div>
            <h2 id="opportunities-roi-title">{t('ROI por oportunidad', 'ROI by opportunity')}</h2>
            <p className="muted small">
              {t(
                'Compras y ventas ligadas a cada oportunidad, con su propio costo promedio. "Planeado" es el cambio de precio entre la activacion y el cierre de la oportunidad.',
                'Buys and sells linked to each opportunity, with their own average cost. "Planned" is the price change between the activation and the close of the opportunity.',
              )}
            </p>
          </div>
          <div className="panel">
            <div className="table-wrap">
              <table className="table table--cards">
                <thead>
                  <tr>
                    <th scope="col">{t('Oportunidad', 'Opportunity')}</th>
                    <th scope="col">{t('Estado', 'Status')}</th>
                    <th scope="col" className="num">
                      {t('Comprado / vendido', 'Bought / sold')}
                    </th>
                    <th scope="col" className="num">
                      {t('Invertido', 'Invested')}
                    </th>
                    <th scope="col" className="num">
                      {t('G/P realizada', 'Realized P/L')}
                    </th>
                    <th scope="col" className="num">
                      {t('G/P no realizada', 'Unrealized P/L')}
                    </th>
                    <th scope="col" className="num">
                      ROI
                    </th>
                    <th scope="col" className="num">
                      {t('Planeado', 'Planned')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roi.opportunities.map((item) => (
                    <tr key={item.idOpportunity} className="table__row" data-status={item.tagStatus || undefined}>
                      <td className="cell--main">
                        <strong>{item.tagTrigger || t('Oportunidad no visible', 'Opportunity not visible')}</strong>{' '}
                        <span className="muted small">
                          {item.tagAsset}
                          {item.tagAction && ` · ${item.tagAction}`} · {item.transactions}{' '}
                          {item.transactions === 1 ? t('transaccion', 'transaction') : t('transacciones', 'transactions')}
                        </span>
                        {item.warning && <div className="form-field__error small">{item.warning}</div>}
                      </td>
                      <td data-label={t('Estado', 'Status')}>
                        {item.tagStatus ? <StatusBadge tag={item.tagStatus} label={opportunityStatusName(item.tagStatus)} /> : '—'}
                      </td>
                      <td className="num" data-label={t('Comprado / vendido', 'Bought / sold')}>
                        {formatQuantity(item.quantityBought)} / {formatQuantity(item.quantitySold)}
                      </td>
                      <td className="num" data-label={t('Invertido', 'Invested')}>
                        {formatMoney(item.investedCost)}
                      </td>
                      <td className="num" data-label={t('G/P realizada', 'Realized P/L')}>
                        <span className="pnl" data-tone={pnlTone(item.realizedPnl)}>
                          {formatSignedMoney(item.realizedPnl)}
                        </span>
                      </td>
                      <td className="num" data-label={t('G/P no realizada', 'Unrealized P/L')}>
                        <span className="pnl" data-tone={pnlTone(item.unrealizedPnl)}>
                          {formatSignedMoney(item.unrealizedPnl)}
                        </span>
                      </td>
                      <td className="num" data-label="ROI">
                        <strong className="pnl" data-tone={pnlTone(item.roi)}>
                          {formatSignedPercent(item.roi)}
                        </strong>
                      </td>
                      <td className="num" data-label={t('Planeado', 'Planned')}>
                        {formatSignedPercent(item.plannedPriceChange)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
