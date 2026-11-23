import { useState } from 'react';
import { deletePortfolioTransaction, listPortfolioTransactions } from '../api/portfolios';
import { useApiMutation } from '../hooks/useApiMutation';
import { useApiQuery } from '../hooks/useApiQuery';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { t } from '../i18n/language';
import { TRANSACTION_TYPES, transactionType, type PortfolioTransaction } from '../models/portfolio';
import { formatDateTime, formatMoney, formatPrice, formatQuantity } from '../utils/format';
import { ErrorBanner } from './ErrorBanner';
import { Pagination } from './Pagination';

const DEFAULT_LIMIT = 10;

interface PortfolioTransactionsProps {
  idPortfolio: string;
  // Cambia cuando se registra o edita una transaccion: vuelve a pedir el listado
  reloadKey: number;
  // Trigger de cada oportunidad ligada (sale del ROI), para no mostrar solo el id
  opportunityLabels: ReadonlyMap<string, string>;
  onEdit: (transaction: PortfolioTransaction) => void;
  // Despues de borrar: el padre refresca el ROI
  onDeleted: () => void;
}

// Historial de transacciones del portfolio con filtros, edicion y borrado
export function PortfolioTransactions({
  idPortfolio,
  reloadKey,
  opportunityLabels,
  onEdit,
  onDeleted,
}: PortfolioTransactionsProps) {
  const [tagType, setTagType] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const debouncedSearch = useDebouncedValue(search.trim());

  const list = useApiQuery(
    (signal) =>
      listPortfolioTransactions(
        {
          idPortfolio,
          limit,
          page,
          search: debouncedSearch,
          tagTypeTransaction: tagType || undefined,
          // Dias completos en hora local, enviados en RFC3339 (C-TRD filtra executedAt en UTC)
          startDate: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : undefined,
          endDate: endDate ? new Date(`${endDate}T23:59:59.999`).toISOString() : undefined,
        },
        signal,
      ),
    [idPortfolio, limit, page, debouncedSearch, tagType, startDate, endDate, reloadKey],
  );

  const remove = useApiMutation(deletePortfolioTransaction);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (idTransaction: string) => {
    setConfirmId(null);
    setDeletingId(idTransaction);
    const result = await remove.run({ idTransaction });
    setDeletingId(null);
    if (result.ok) {
      list.refetch();
      onDeleted();
    }
  };

  const resetPage = () => setPage(1);

  return (
    <section className="stack" aria-labelledby="transactions-title">
      <div className="page__head">
        <h2 id="transactions-title">{t('Transacciones', 'Transactions')}</h2>
        <div className="filters">
          <label className="field">
            <span>{t('Tipo', 'Type')}</span>
            <select
              value={tagType}
              onChange={(event) => {
                setTagType(event.target.value);
                resetPage();
              }}
            >
              <option value="">{t('Todos', 'All')}</option>
              {TRANSACTION_TYPES.map((item) => (
                <option key={item.tag} value={item.tag}>
                  {t(item.label)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('Desde', 'From')}</span>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => {
                setStartDate(event.target.value);
                resetPage();
              }}
            />
          </label>
          <label className="field">
            <span>{t('Hasta', 'To')}</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => {
                setEndDate(event.target.value);
                resetPage();
              }}
            />
          </label>
          <label className="field field--grow">
            <span>{t('Buscar', 'Search')}</span>
            <input
              type="search"
              placeholder={t('Asset o comentario', 'Asset or comment')}
              value={search}
              maxLength={100}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
            />
          </label>
        </div>
      </div>

      {list.error && <ErrorBanner error={list.error} onRetry={list.refetch} stale={!!list.data} />}
      {remove.error && <ErrorBanner error={remove.error} />}

      <div className="panel" aria-busy={list.isLoading || list.isRefreshing}>
        {list.isLoading ? (
          <p className="empty">{t('Cargando transacciones…', 'Loading transactions…')}</p>
        ) : (
          list.data &&
          (list.data.transactions.length === 0 ? (
            <p className="empty">{t('No hay transacciones con estos filtros.', 'No transactions match these filters.')}</p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table--cards">
                  <thead>
                    <tr>
                      <th scope="col">{t('Transaccion', 'Transaction')}</th>
                      <th scope="col">{t('Ejecutada', 'Executed')}</th>
                      <th scope="col" className="num">
                        {t('Cantidad', 'Quantity')}
                      </th>
                      <th scope="col" className="num">
                        {t('Precio', 'Price')}
                      </th>
                      <th scope="col" className="num">
                        {t('Valor', 'Value')}
                      </th>
                      <th scope="col" className="num">
                        {t('Comision', 'Fee')}
                      </th>
                      <th scope="col">{t('Oportunidad', 'Opportunity')}</th>
                      <th scope="col" aria-label={t('Acciones', 'Actions')} />
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.transactions.map((transaction) => {
                      const type = transactionType(transaction.tagTypeTransaction);
                      const movesPosition = type?.movesPosition ?? false;
                      return (
                        <tr key={transaction.id} className="table__row" data-type={transaction.tagTypeTransaction}>
                          <td className="cell--main">
                            <span className="transaction-type">
                              {type ? t(type.label) : transaction.nameTypeTransaction}
                            </span>{' '}
                            {transaction.idAsset && (
                              <span>
                                <strong>{transaction.tagAsset}</strong>{' '}
                                <span className="muted small">{transaction.nameAsset}</span>
                              </span>
                            )}
                            {transaction.comment && <div className="muted small transaction-comment">{transaction.comment}</div>}
                          </td>
                          <td data-label={t('Ejecutada', 'Executed')}>{formatDateTime(transaction.executedAt)}</td>
                          <td className="num" data-label={t('Cantidad', 'Quantity')}>
                            {movesPosition ? formatQuantity(transaction.quantity) : '—'}
                          </td>
                          <td className="num" data-label={t('Precio', 'Price')}>
                            {movesPosition ? formatPrice(transaction.unitPrice) : '—'}
                          </td>
                          <td className="num" data-label={t('Valor', 'Value')}>
                            <span className="pnl" data-tone={type?.cashSign === 1 ? 'up' : 'down'}>
                              {type?.cashSign === 1 ? '+' : '-'}
                              {formatMoney(transaction.value)}
                            </span>
                          </td>
                          <td className="num" data-label={t('Comision', 'Fee')}>
                            {transaction.fee ? formatMoney(transaction.fee) : '—'}
                          </td>
                          <td data-label={t('Oportunidad', 'Opportunity')}>
                            {transaction.idOpportunity
                              ? (opportunityLabels.get(transaction.idOpportunity) ?? transaction.idOpportunity.slice(-6))
                              : '—'}
                          </td>
                          <td className="cell--actions">
                            {confirmId === transaction.id ? (
                              <span className="review-buttons">
                                <button
                                  type="button"
                                  className="button button--danger button--small"
                                  onClick={() => void handleDelete(transaction.id)}
                                >
                                  {t('Confirmar', 'Confirm')}
                                </button>
                                <button
                                  type="button"
                                  className="button button--ghost button--small"
                                  onClick={() => setConfirmId(null)}
                                >
                                  {t('Cancelar', 'Cancel')}
                                </button>
                              </span>
                            ) : (
                              <span className="review-buttons">
                                <button
                                  type="button"
                                  className="button button--small"
                                  onClick={() => onEdit(transaction)}
                                  disabled={deletingId !== null}
                                >
                                  {t('Editar', 'Edit')}
                                </button>
                                <button
                                  type="button"
                                  className="button button--small"
                                  onClick={() => setConfirmId(transaction.id)}
                                  disabled={deletingId !== null}
                                >
                                  {deletingId === transaction.id ? t('Borrando…', 'Deleting…') : t('Borrar', 'Delete')}
                                </button>
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
  );
}
