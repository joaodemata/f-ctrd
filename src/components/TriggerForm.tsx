import { useState, type FormEvent, type ReactNode } from 'react';
import type { ApiError } from '../api/errors';
import type { TriggerFields } from '../api/triggers';
import type { VisibilityBody } from '../api/types';
import { TRIGGER_CODE_WEBHOOK_PLACEHOLDER } from '../models/agent';
import { CatalogType, TIMEFRAME_MINUTES, type Catalog } from '../models/catalog';
import type { Trigger } from '../models/trigger';
import { formatDuration } from '../utils/format';
import { AssetPicker, type AssetOption } from './AssetPicker';
import { CatalogSelect } from './CatalogSelect';
import { ConditionPicker, type ConditionOption } from './ConditionPicker';
import { ErrorBanner } from './ErrorBanner';
import { FormField } from './FormField';
import {
  EMPTY_VISIBILITY_FORM,
  VisibilityFields,
  validateVisibility,
  visibilityBody,
  visibilityServerErrors,
  type VisibilityFieldErrors,
  type VisibilityFormValues,
} from './VisibilityFields';
import { t } from '../i18n/language';

type CatalogOption = Pick<Catalog, 'id' | 'tag' | 'name'>;

// Limite del codigo en C-TRD (CreateTriggerFormat.Code: max=65536)
const MAX_CODE_BYTES = 65536;

export interface TriggerFormValues {
  tag: string;
  name: string;
  description: string;
  asset: AssetOption | null;
  action: CatalogOption | null;
  timeframe: CatalogOption | null;
  maxCandlestickQty: string;
  conditions: ConditionOption[];
  // Codigo del sistema externo (Pine). Vacio no se envia: al crear queda sin codigo y al editar se conserva
  code: string;
  // Solo al crear: al actualizar C-TRD conserva la visibilidad del trigger anterior
  visibility: VisibilityFormValues;
}

export const EMPTY_TRIGGER_FORM: TriggerFormValues = {
  tag: '',
  name: '',
  description: '',
  asset: null,
  action: null,
  timeframe: null,
  maxCandlestickQty: '',
  conditions: [],
  code: '',
  visibility: EMPTY_VISIBILITY_FORM,
};

// Valores iniciales para editar: el trigger guarda copia del id, tag y nombre de cada referencia
export function triggerFormValues(trigger: Trigger): TriggerFormValues {
  return {
    tag: trigger.tag,
    name: trigger.name,
    description: trigger.description,
    asset: { id: trigger.idAsset, tag: trigger.tagAsset, name: trigger.asset },
    action: { id: trigger.idAction, tag: trigger.tagAction, name: trigger.action },
    timeframe: {
      id: trigger.idCandlestickTimeframe,
      tag: trigger.tagCandlestickTimeframe,
      name: trigger.candlestickTimeframe,
    },
    maxCandlestickQty: String(trigger.maxCandlestickQty),
    conditions: (trigger.conditions ?? []).map((condition) => ({
      id: condition.idCondition,
      name: condition.nameCondition,
    })),
    code: trigger.pineCode ?? '',
    visibility: EMPTY_VISIBILITY_FORM,
  };
}

type FieldErrors = Partial<Record<keyof TriggerFields, string>>;

// Mismas reglas que CreateTriggerFormat / UpdateTriggerFormat en C-TRD, para avisar antes de enviar
function validate(values: TriggerFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.tag.trim()) errors.tag = t('El tag es obligatorio.', 'The tag is required.');
  if (!values.name.trim()) errors.name = t('El nombre es obligatorio.', 'The name is required.');
  if (!values.description.trim()) errors.description = t('La descripcion es obligatoria.', 'The description is required.');
  if (!values.asset) errors.idAsset = t('Elige un asset.', 'Choose an asset.');
  if (!values.action) errors.idAction = t('Elige una accion.', 'Choose an action.');
  if (!values.timeframe) errors.idCandlestickTimeframe = t('Elige una temporalidad.', 'Choose a timeframe.');
  const qty = Number(values.maxCandlestickQty);
  if (!Number.isInteger(qty) || qty <= 0) {
    errors.maxCandlestickQty = t('Debe ser un numero entero mayor a 0.', 'Must be a whole number greater than 0.');
  }
  if (new TextEncoder().encode(values.code).length > MAX_CODE_BYTES) {
    errors.code = t('El codigo no puede superar 64 KB.', 'The code cannot exceed 64 KB.');
  }
  return errors;
}

function timeframeDisabledReason(catalog: Catalog): string | null {
  return TIMEFRAME_MINUTES[catalog.tag] === undefined ? t('sin duracion conocida', 'no known duration') : null;
}

interface TriggerFormProps {
  initialValues: TriggerFormValues;
  // visibility es null si el formulario no la muestra (withVisibility)
  onSubmit: (fields: TriggerFields, visibility: VisibilityBody | null) => void;
  // Muestra la visibilidad: solo al crear
  withVisibility?: boolean;
  isPending: boolean;
  error: ApiError | undefined;
  submitLabel: string;
  pendingLabel: string;
  // Boton secundario: limpiar al crear, cancelar al editar
  cancelLabel: string;
  onCancel: () => void;
  // Aviso antes de los botones (ej: que implica actualizar)
  notice?: ReactNode;
  // Texto extra bajo el codigo (ej: al editar, que vacio lo conserva)
  codeHint?: ReactNode;
}

// Campos de un trigger, compartidos por el alta (TriggerPage) y la edicion (TriggersPage). El padre remonta el
// formulario con otra `key` para volver a los valores iniciales
export function TriggerForm({
  initialValues,
  onSubmit,
  isPending,
  error,
  submitLabel,
  pendingLabel,
  cancelLabel,
  onCancel,
  notice,
  codeHint,
  withVisibility = false,
}: TriggerFormProps) {
  const [values, setValues] = useState<TriggerFormValues>(initialValues);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [visibilityErrors, setVisibilityErrors] = useState<VisibilityFieldErrors>({});

  const set = <K extends keyof TriggerFormValues>(key: K, value: TriggerFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  // Error local primero; si no, el que devolvio C-TRD para ese campo
  const fieldError = (field: keyof TriggerFields) => clientErrors[field] ?? error?.fieldErrors[field];
  const serverVisibilityErrors = visibilityServerErrors(error);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const errors = validate(values);
    const nextVisibilityErrors = withVisibility ? validateVisibility(values.visibility) : {};
    setClientErrors(errors);
    setVisibilityErrors(nextVisibilityErrors);
    if (
      Object.keys(errors).length > 0 ||
      Object.keys(nextVisibilityErrors).length > 0 ||
      !values.asset ||
      !values.action ||
      !values.timeframe
    ) {
      return;
    }

    const fields: TriggerFields = {
      tag: values.tag.trim(),
      name: values.name.trim(),
      description: values.description.trim(),
      idAsset: values.asset.id,
      idAction: values.action.id,
      idCandlestickTimeframe: values.timeframe.id,
      maxCandlestickQty: Number(values.maxCandlestickQty),
      conditions: values.conditions.map((condition) => condition.id),
      ...(values.code.trim() ? { code: values.code } : {}),
    };
    onSubmit(fields, withVisibility ? visibilityBody(values.visibility) : null);
  };

  const qty = Number(values.maxCandlestickQty);
  const candleMinutes = values.timeframe ? TIMEFRAME_MINUTES[values.timeframe.tag] : undefined;
  const expiration =
    candleMinutes !== undefined && Number.isInteger(qty) && qty > 0 ? formatDuration(candleMinutes * qty) : null;

  return (
    <form className="panel panel--padded form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <FormField
          label="Tag"
          required
          error={fieldError('tag')}
          hint={t('Identificador unico del trigger.', 'Unique identifier of the trigger.')}
        >
          <input
            value={values.tag}
            onChange={(event) => set('tag', event.target.value)}
            placeholder="BTC-RSI-OVERSOLD"
            maxLength={100}
            aria-invalid={!!fieldError('tag')}
          />
        </FormField>
        <FormField label={t('Nombre', 'Name')} required error={fieldError('name')}>
          <input
            value={values.name}
            onChange={(event) => set('name', event.target.value)}
            placeholder={t('RSI en sobreventa', 'Oversold RSI')}
            maxLength={200}
            aria-invalid={!!fieldError('name')}
          />
        </FormField>
      </div>

      <FormField
        label={t('Descripcion', 'Description')}
        required
        error={fieldError('description')}
        hint={t('Que principio utiliza el trigger.', 'What principle the trigger uses.')}
      >
        <textarea
          value={values.description}
          onChange={(event) => set('description', event.target.value)}
          rows={3}
          maxLength={1000}
          aria-invalid={!!fieldError('description')}
        />
      </FormField>

      <FormField label="Asset" required as="fieldset" error={fieldError('idAsset')}>
        <AssetPicker value={values.asset} onChange={(asset) => set('asset', asset)} invalid={!!fieldError('idAsset')} />
      </FormField>

      <div className="form-grid">
        <FormField label={t('Accion', 'Action')} required error={fieldError('idAction')}>
          <CatalogSelect
            type={CatalogType.Action}
            value={values.action}
            onChange={(action) => set('action', action)}
            placeholder={t('Elige una accion', 'Choose an action')}
            invalid={!!fieldError('idAction')}
          />
        </FormField>
        <FormField label={t('Temporalidad de vela', 'Candle timeframe')} required error={fieldError('idCandlestickTimeframe')}>
          <CatalogSelect
            type={CatalogType.CandleStick}
            value={values.timeframe}
            onChange={(timeframe) => set('timeframe', timeframe)}
            placeholder={t('Elige una temporalidad', 'Choose a timeframe')}
            disabledReason={timeframeDisabledReason}
            invalid={!!fieldError('idCandlestickTimeframe')}
          />
        </FormField>
        <FormField
          label={t('Maximo de velas', 'Max candles')}
          required
          error={fieldError('maxCandlestickQty')}
          hint={
            expiration
              ? t(`Las oportunidades expiran tras ${expiration}.`, `Opportunities expire after ${expiration}.`)
              : t('Velas hasta que la oportunidad expira.', 'Candles until the opportunity expires.')
          }
        >
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={values.maxCandlestickQty}
            onChange={(event) => set('maxCandlestickQty', event.target.value)}
            aria-invalid={!!fieldError('maxCandlestickQty')}
          />
        </FormField>
      </div>

      <FormField
        label={`${t('Condiciones', 'Conditions')} (${values.conditions.length})`}
        as="fieldset"
        error={fieldError('conditions')}
        hint={
          <>
            {t('Opcional. La oportunidad pasa a ', 'Optional. The opportunity becomes ')}
            <strong>{t('Activa', 'Active')}</strong>
            {t(' cuando se cumplen todas.', ' when all of them are met.')}{' '}
            <a href="#/condiciones">{t('Crear una condicion', 'Create a condition')}</a>
          </>
        }
      >
        <ConditionPicker value={values.conditions} onChange={(conditions) => set('conditions', conditions)} />
      </FormField>

      <FormField
        label={t('Codigo (Pine de TradingView)', 'Code (TradingView Pine)')}
        error={fieldError('code')}
        hint={
          <>
            {t('Opcional. ', 'Optional. ')}
            <code>{TRIGGER_CODE_WEBHOOK_PLACEHOLDER}</code>
            {t(' se reemplaza por el ID del webhook al guardar.', ' is replaced with the webhook ID on save.')}
            {codeHint && <> {codeHint}</>}
          </>
        }
      >
        <textarea
          className="textarea--code"
          value={values.code}
          onChange={(event) => set('code', event.target.value)}
          rows={6}
          spellCheck={false}
          aria-invalid={!!fieldError('code')}
        />
      </FormField>

      {withVisibility && (
        <VisibilityFields
          values={values.visibility}
          onChange={(visibility) => set('visibility', visibility)}
          errors={{ ...serverVisibilityErrors, ...visibilityErrors }}
          note={t(
            'Las oportunidades del trigger copian su visibilidad y se mantiene al actualizarlo.',
            'The trigger\'s opportunities copy its visibility, and it is kept when the trigger is updated.',
          )}
        />
      )}

      {notice}
      {error && <ErrorBanner error={error} />}

      <div className="form-actions">
        <button type="submit" className="button button--primary" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </button>
        <button type="button" className="button button--ghost" onClick={onCancel} disabled={isPending}>
          {cancelLabel}
        </button>
      </div>
    </form>
  );
}
