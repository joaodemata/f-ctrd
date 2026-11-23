import { useState, type FormEvent } from 'react';
import { listOpportunities } from '../api/opportunities';
import {
  createPortfolioTransaction,
  updatePortfolioTransaction,
  type PortfolioTransactionFields,
} from '../api/portfolios';
import { useApiMutation } from '../hooks/useApiMutation';
import { useApiQuery } from '../hooks/useApiQuery';
import { t } from '../i18n/language';
import { OpportunityStatusTag } from '../models/opportunity';
import {
  TRANSACTION_COMMENT_MAX,
  TRANSACTION_TYPES,
  TransactionTypeTag,
  transactionType,
  type PortfolioTransaction,
} from '../models/portfolio';
import { escapeRegex, formatDateTime, formatMoney, parseApiDate } from '../utils/format';
import { AssetPicker, type AssetOption } from './AssetPicker';
import { ErrorBanner } from './ErrorBanner';
import { FormField } from './FormField';

// Valores iniciales al abrir el formulario desde una posicion (comprar mas / vender)
export interface TransactionPreset {
  tag: string;
  asset: AssetOption;
}

interface TransactionFormProps {
  idPortfolio: string;
  // Transaccion a editar; sin ella se crea una nueva
  transaction?: PortfolioTransaction;
  preset?: TransactionPreset;
  onSaved: () => void;
  onCancel: () => void;
}

interface FormValues {
  tag: string;
  asset: AssetOption | null;
  idOpportunity: string;
  quantity: string;
  unitPrice: string;
  value: string;
  fee: string;
  executedAt: string; // datetime-local en hora local
  comment: string;
}

type FieldErrors = Partial<Record<keyof PortfolioTransactionFields | 'idTypeTransaction', string>>;

const pad = (value: number) => String(value).padStart(2, '0');

// Fecha en el formato de <input type="datetime-local"> (hora local, sin segundos)
function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Los montos vacios se envian como 0 (C-TRD exige 0 en los campos que no lleva el tipo)
function toNumber(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return value.trim() === '' || Number.isNaN(parsed) ? 0 : parsed;
}

function initialValues(transaction?: PortfolioTransaction, preset?: TransactionPreset): FormValues {
  if (transaction) {
    const executed = parseApiDate(transaction.executedAt);
    const type = transactionType(transaction.tagTypeTransaction);
    return {
      tag: transaction.tagTypeTransaction,
      asset: transaction.idAsset
        ? { id: transaction.idAsset, tag: transaction.tagAsset, name: transaction.nameAsset, typeName: transaction.typeNameAsset }
        : null,
      idOpportunity: transaction.idOpportunity ?? '',
      quantity: type?.movesPosition ? String(transaction.quantity) : '',
      unitPrice: type?.movesPosition ? String(transaction.unitPrice) : '',
      value: type?.movesPosition ? '' : String(transaction.value),
      fee: transaction.fee ? String(transaction.fee) : '',
      executedAt: executed ? toLocalInput(executed) : toLocalInput(new Date()),
      comment: transaction.comment,
    };
  }
  return {
    tag: preset?.tag ?? TransactionTypeTag.Buy,
    asset: preset?.asset ?? null,
    idOpportunity: '',
    quantity: '',
    unitPrice: '',
    value: '',
    fee: '',
    executedAt: toLocalInput(new Date()),
    comment: '',
  };
}

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  const type = transactionType(values.tag);
  if (!type) {
    errors.idTypeTransaction = t('Elige un tipo de transaccion.', 'Choose a transaction type.');
    return errors;
  }
  if (type.needsAsset && !values.asset) errors.idAsset = t('Elige un asset.', 'Choose an asset.');
  if (type.movesPosition) {
    if (!(toNumber(values.quantity) > 0)) errors.quantity = t('La cantidad debe ser mayor a 0.', 'Quantity must be greater than 0.');
    if (!(toNumber(values.unitPrice) > 0)) errors.unitPrice = t('El precio debe ser mayor a 0.', 'Price must be greater than 0.');
  } else if (!(toNumber(values.value) > 0)) {
    errors.value = t('El monto debe ser mayor a 0.', 'Amount must be greater than 0.');
  }
  if (toNumber(values.fee) < 0) errors.fee = t('La comision no puede ser negativa.', 'The fee cannot be negative.');
  const executed = values.executedAt ? new Date(values.executedAt) : null;
  if (!executed || Number.isNaN(executed.getTime())) {
    errors.executedAt = t('Indica la fecha de ejecucion.', 'Enter the execution date.');
  } else if (executed.getTime() > Date.now()) {
    errors.executedAt = t('La fecha no puede estar en el futuro.', 'The date cannot be in the future.');
  }
  if (values.comment.length > TRANSACTION_COMMENT_MAX) {
    errors.comment = t(`Maximo ${TRANSACTION_COMMENT_MAX} caracteres.`, `Up to ${TRANSACTION_COMMENT_MAX} characters.`);
  }
  return errors;
}

// Solo lo que lleva el tipo: C-TRD rechaza quantity/unitPrice en dividendos, value en compras, asset en depositos...
function buildFields(values: FormValues): PortfolioTransactionFields {
  const type = transactionType(values.tag)!;
  return {
    idTypeTransaction: type.id,
    idAsset: type.needsAsset ? values.asset?.id : undefined,
    idOpportunity: type.movesPosition && values.idOpportunity ? values.idOpportunity : undefined,
    quantity: type.movesPosition ? toNumber(values.quantity) : 0,
    unitPrice: type.movesPosition ? toNumber(values.unitPrice) : 0,
    value: type.movesPosition ? 0 : toNumber(values.value),
    fee: toNumber(values.fee),
    executedAt: new Date(values.executedAt).toISOString(),
    comment: values.comment.trim(),
  };
}

// Alta y edicion de una transaccion del portfolio. Los campos cambian segun el tipo
export function TransactionForm({ idPortfolio, transaction, preset, onSaved, onCancel }: TransactionFormProps) {
  const [values, setValues] = useState<FormValues>(() => initialValues(transaction, preset));
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const save = useApiMutation((fields: PortfolioTransactionFields, signal: AbortSignal) =>
    transaction
      ? updatePortfolioTransaction({ ...fields, idTransaction: transaction.id }, signal)
      : createPortfolioTransaction({ ...fields, idPortfolio }, signal),
  );

  const type = transactionType(values.tag);
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const fieldError = (field: keyof FieldErrors) => clientErrors[field] ?? save.error?.fieldErrors[field];

  const total = type?.movesPosition ? toNumber(values.quantity) * toNumber(values.unitPrice) : toNumber(values.value);
  const fee = toNumber(values.fee);
  // Efectivo que entra o sale: las compras pagan la comision encima y las ventas la descuentan
  const cashImpact = type ? type.cashSign * total - fee : 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors = validate(values);
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const result = await save.run(buildFields(values));
    if (result.ok) onSaved();
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <FormField label={t('Tipo', 'Type')} required as="fieldset" error={fieldError('idTypeTransaction')}>
        <div className="chip-group" role="group">
          {TRANSACTION_TYPES.map((item) => (
            <button
              key={item.tag}
              type="button"
              className="button button--small"
              data-type={item.tag}
              aria-pressed={values.tag === item.tag}
              onClick={() => set('tag', item.tag)}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
      </FormField>

      {type?.needsAsset && (
        <FormField label="Asset" required as="fieldset" error={fieldError('idAsset')}>
          <AssetPicker
            value={values.asset}
            onChange={(asset) => setValues((current) => ({ ...current, asset, idOpportunity: '' }))}
            invalid={!!fieldError('idAsset')}
          />
        </FormField>
      )}

      <div className="form-grid">
        {type?.movesPosition ? (
          <>
            <FormField label={t('Cantidad', 'Quantity')} required error={fieldError('quantity')}>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={values.quantity}
                onChange={(event) => set('quantity', event.target.value)}
                aria-invalid={!!fieldError('quantity')}
              />
            </FormField>
            <FormField label={t('Precio por unidad (USD)', 'Unit price (USD)')} required error={fieldError('unitPrice')}>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={values.unitPrice}
                onChange={(event) => set('unitPrice', event.target.value)}
                aria-invalid={!!fieldError('unitPrice')}
              />
            </FormField>
          </>
        ) : (
          <FormField label={t('Monto (USD)', 'Amount (USD)')} required error={fieldError('value')}>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={values.value}
              onChange={(event) => set('value', event.target.value)}
              aria-invalid={!!fieldError('value')}
            />
          </FormField>
        )}
        <FormField label={t('Comision (USD)', 'Fee (USD)')} error={fieldError('fee')}>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={values.fee}
            onChange={(event) => set('fee', event.target.value)}
            aria-invalid={!!fieldError('fee')}
          />
        </FormField>
        <FormField label={t('Ejecutada', 'Executed')} required error={fieldError('executedAt')}>
          <input
            type="datetime-local"
            value={values.executedAt}
            max={toLocalInput(new Date())}
            onChange={(event) => set('executedAt', event.target.value)}
            aria-invalid={!!fieldError('executedAt')}
          />
        </FormField>
      </div>

      {type?.movesPosition && values.asset && (
        <FormField
          label={t('Oportunidad (opcional)', 'Opportunity (optional)')}
          error={fieldError('idOpportunity')}
          hint={t(
            'Liga la operacion a una oportunidad activa o finalizada del mismo asset para medir su ROI.',
            'Link the trade to an active or finished opportunity of the same asset to track its ROI.',
          )}
        >
          <OpportunitySelect
            asset={values.asset}
            value={values.idOpportunity}
            onChange={(id) => set('idOpportunity', id)}
            invalid={!!fieldError('idOpportunity')}
          />
        </FormField>
      )}

      <FormField label={t('Comentario', 'Comment')} error={fieldError('comment')}>
        <textarea
          rows={2}
          maxLength={TRANSACTION_COMMENT_MAX}
          value={values.comment}
          onChange={(event) => set('comment', event.target.value)}
        />
      </FormField>

      {type && total > 0 && (
        <p className="muted small transaction-form__total">
          {type.movesPosition && <>{t('Valor', 'Value')}: <strong>{formatMoney(total)}</strong> · </>}
          {t('Efectivo', 'Cash')}:{' '}
          <strong className="pnl" data-tone={cashImpact >= 0 ? 'up' : 'down'}>
            {cashImpact >= 0 ? '+' : ''}
            {formatMoney(cashImpact)}
          </strong>
        </p>
      )}

      {save.error && <ErrorBanner error={save.error} />}

      <div className="form-actions">
        <button type="submit" className="button button--primary" disabled={save.isPending}>
          {save.isPending
            ? t('Guardando…', 'Saving…')
            : transaction
              ? t('Guardar cambios', 'Save changes')
              : t('Registrar', 'Record')}
        </button>
        <button type="button" className="button button--ghost" onClick={onCancel} disabled={save.isPending}>
          {t('Cancelar', 'Cancel')}
        </button>
      </div>
    </form>
  );
}

const OPPORTUNITY_PICKER_LIMIT = 50;
const LINKABLE_STATUSES: readonly string[] = [OpportunityStatusTag.Active, OpportunityStatusTag.Finished];

interface OpportunitySelectProps {
  asset: AssetOption;
  value: string;
  onChange: (idOpportunity: string) => void;
  invalid: boolean;
}

// Oportunidades visibles del asset que se pueden ligar (activas o finalizadas). /list/opportunities no filtra por
// asset: se busca por su nombre (regex escapado) y se filtra aqui por id y estado
function OpportunitySelect({ asset, value, onChange, invalid }: OpportunitySelectProps) {
  const opportunities = useApiQuery(
    (signal) => listOpportunities({ limit: OPPORTUNITY_PICKER_LIMIT, search: escapeRegex(asset.name) }, signal),
    [asset.id, asset.name],
  );
  const options = (opportunities.data?.opportunities ?? []).filter(
    (item) => item.idAsset === asset.id && LINKABLE_STATUSES.includes(item.tagStatus),
  );
  // Al editar, la oportunidad ligada puede no estar entre las ultimas
  const showCurrent = value !== '' && !options.some((item) => item.id === value);

  return (
    <>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={opportunities.isLoading}
        aria-invalid={invalid}
      >
        <option value="">
          {opportunities.isLoading ? t('Cargando…', 'Loading…') : t('Sin oportunidad', 'No opportunity')}
        </option>
        {showCurrent && <option value={value}>{t('Oportunidad ligada', 'Linked opportunity')} ({value.slice(-6)})</option>}
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.tagTrigger} · {item.action || item.tagAction} · {item.status} · {formatDateTime(item.createdDate)}
          </option>
        ))}
      </select>
      {opportunities.error && (
        <ErrorBanner error={opportunities.error} onRetry={opportunities.refetch} stale={!!opportunities.data} />
      )}
    </>
  );
}
