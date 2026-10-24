import { useState, type FormEvent, type ReactNode } from 'react';
import type { ApiError } from '../api/errors';
import type { CreateTriggerBody } from '../api/triggers';
import { CatalogType, TIMEFRAME_MINUTES, type Catalog } from '../models/catalog';
import type { Trigger } from '../models/trigger';
import { formatDuration } from '../utils/format';
import { AssetPicker, type AssetOption } from './AssetPicker';
import { CatalogSelect } from './CatalogSelect';
import { ConditionPicker, type ConditionOption } from './ConditionPicker';
import { ErrorBanner } from './ErrorBanner';
import { FormField } from './FormField';

type CatalogOption = Pick<Catalog, 'id' | 'tag' | 'name'>;

export interface TriggerFormValues {
  tag: string;
  name: string;
  description: string;
  asset: AssetOption | null;
  action: CatalogOption | null;
  timeframe: CatalogOption | null;
  maxCandlestickQty: string;
  conditions: ConditionOption[];
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
      nameCondition: condition.nameCondition,
    })),
  };
}

type FieldErrors = Partial<Record<keyof CreateTriggerBody, string>>;

// Mismas reglas que CreateTriggerFormat / UpdateTriggerFormat en C-TRD, para avisar antes de enviar
function validate(values: TriggerFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.tag.trim()) errors.tag = 'El tag es obligatorio.';
  if (!values.name.trim()) errors.name = 'El nombre es obligatorio.';
  if (!values.description.trim()) errors.description = 'La descripcion es obligatoria.';
  if (!values.asset) errors.idAsset = 'Elige un asset.';
  if (!values.action) errors.idAction = 'Elige una accion.';
  if (!values.timeframe) errors.idCandlestickTimeframe = 'Elige una temporalidad.';
  const qty = Number(values.maxCandlestickQty);
  if (!Number.isInteger(qty) || qty <= 0) errors.maxCandlestickQty = 'Debe ser un numero entero mayor a 0.';
  return errors;
}

function timeframeDisabledReason(catalog: Catalog): string | null {
  return TIMEFRAME_MINUTES[catalog.tag] === undefined ? 'sin duracion conocida' : null;
}

interface TriggerFormProps {
  initialValues: TriggerFormValues;
  onSubmit: (body: CreateTriggerBody) => void;
  isPending: boolean;
  error: ApiError | undefined;
  submitLabel: string;
  pendingLabel: string;
  // Boton secundario: limpiar al crear, cancelar al editar
  cancelLabel: string;
  onCancel: () => void;
  // Aviso antes de los botones (ej: que implica actualizar)
  notice?: ReactNode;
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
}: TriggerFormProps) {
  const [values, setValues] = useState<TriggerFormValues>(initialValues);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});

  const set = <K extends keyof TriggerFormValues>(key: K, value: TriggerFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  // Error local primero; si no, el que devolvio C-TRD para ese campo
  const fieldError = (field: keyof CreateTriggerBody) => clientErrors[field] ?? error?.fieldErrors[field];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const errors = validate(values);
    setClientErrors(errors);
    if (Object.keys(errors).length > 0 || !values.asset || !values.action || !values.timeframe) return;

    onSubmit({
      tag: values.tag.trim(),
      name: values.name.trim(),
      description: values.description.trim(),
      idAsset: values.asset.id,
      idAction: values.action.id,
      idCandlestickTimeframe: values.timeframe.id,
      maxCandlestickQty: Number(values.maxCandlestickQty),
      conditions: values.conditions.map((condition) => condition.id),
    });
  };

  const qty = Number(values.maxCandlestickQty);
  const candleMinutes = values.timeframe ? TIMEFRAME_MINUTES[values.timeframe.tag] : undefined;
  const expiration =
    candleMinutes !== undefined && Number.isInteger(qty) && qty > 0 ? formatDuration(candleMinutes * qty) : null;

  return (
    <form className="panel panel--padded form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <FormField label="Tag" required error={fieldError('tag')} hint="Identificador unico del trigger.">
          <input
            value={values.tag}
            onChange={(event) => set('tag', event.target.value)}
            placeholder="BTC-RSI-OVERSOLD"
            maxLength={100}
            aria-invalid={!!fieldError('tag')}
          />
        </FormField>
        <FormField label="Nombre" required error={fieldError('name')}>
          <input
            value={values.name}
            onChange={(event) => set('name', event.target.value)}
            placeholder="RSI en sobreventa"
            maxLength={200}
            aria-invalid={!!fieldError('name')}
          />
        </FormField>
      </div>

      <FormField label="Descripcion" required error={fieldError('description')} hint="Que principio utiliza el trigger.">
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
        <FormField label="Accion" required error={fieldError('idAction')}>
          <CatalogSelect
            type={CatalogType.Action}
            value={values.action}
            onChange={(action) => set('action', action)}
            placeholder="Elige una accion"
            invalid={!!fieldError('idAction')}
          />
        </FormField>
        <FormField label="Temporalidad de vela" required error={fieldError('idCandlestickTimeframe')}>
          <CatalogSelect
            type={CatalogType.CandleStick}
            value={values.timeframe}
            onChange={(timeframe) => set('timeframe', timeframe)}
            placeholder="Elige una temporalidad"
            disabledReason={timeframeDisabledReason}
            invalid={!!fieldError('idCandlestickTimeframe')}
          />
        </FormField>
        <FormField
          label="Maximo de velas"
          required
          error={fieldError('maxCandlestickQty')}
          hint={expiration ? `Las oportunidades expiran tras ${expiration}.` : 'Velas hasta que la oportunidad expira.'}
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
        label={`Condiciones (${values.conditions.length})`}
        as="fieldset"
        error={fieldError('conditions')}
        hint={
          <>
            Opcional. La oportunidad pasa a <strong>Activa</strong> cuando se cumplen todas.{' '}
            <a href="#/condiciones">Crear una condicion</a>
          </>
        }
      >
        <ConditionPicker value={values.conditions} onChange={(conditions) => set('conditions', conditions)} />
      </FormField>

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
