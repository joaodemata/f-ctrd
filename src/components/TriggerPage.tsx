import { useState, type FormEvent } from 'react';
import { apiBaseUrl } from '../api/config';
import { createTrigger, type CreateTriggerBody } from '../api/triggers';
import { useApiMutation } from '../hooks/useApiMutation';
import type { Asset } from '../models/asset';
import { CatalogType, TIMEFRAME_MINUTES, type Catalog } from '../models/catalog';
import type { Condition } from '../models/condition';
import { formatDuration } from '../utils/format';
import { AssetPicker } from './AssetPicker';
import { CatalogSelect } from './CatalogSelect';
import { ConditionPicker } from './ConditionPicker';
import { CopyButton } from './CopyButton';
import { ErrorBanner } from './ErrorBanner';
import { FormField } from './FormField';

interface TriggerFormValues {
  tag: string;
  name: string;
  description: string;
  asset: Asset | null;
  action: Catalog | null;
  timeframe: Catalog | null;
  maxCandlestickQty: string;
  conditions: Condition[];
}

const EMPTY_FORM: TriggerFormValues = {
  tag: '',
  name: '',
  description: '',
  asset: null,
  action: null,
  timeframe: null,
  maxCandlestickQty: '',
  conditions: [],
};

type FieldErrors = Partial<Record<keyof CreateTriggerBody, string>>;

// Mismas reglas que CreateTriggerFormat en C-TRD, para avisar antes de enviar
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

export function TriggerPage() {
  const [values, setValues] = useState<TriggerFormValues>(EMPTY_FORM);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const mutation = useApiMutation(createTrigger);

  const set = <K extends keyof TriggerFormValues>(key: K, value: TriggerFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  // Error local primero; si no, el que devolvio C-TRD para ese campo
  const fieldError = (field: keyof CreateTriggerBody) => clientErrors[field] ?? mutation.error?.fieldErrors[field];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors = validate(values);
    setClientErrors(errors);
    if (Object.keys(errors).length > 0 || !values.asset || !values.action || !values.timeframe) return;

    const result = await mutation.run({
      tag: values.tag.trim(),
      name: values.name.trim(),
      description: values.description.trim(),
      idAsset: values.asset.id,
      idAction: values.action.id,
      idCandlestickTimeframe: values.timeframe.id,
      maxCandlestickQty: Number(values.maxCandlestickQty),
      conditions: values.conditions.map((condition) => condition.id),
    });
    if (result.ok) setValues(EMPTY_FORM);
  };

  const qty = Number(values.maxCandlestickQty);
  const candleMinutes = values.timeframe ? TIMEFRAME_MINUTES[values.timeframe.tag] : undefined;
  const expiration =
    candleMinutes !== undefined && Number.isInteger(qty) && qty > 0 ? formatDuration(candleMinutes * qty) : null;

  if (mutation.data) {
    const hookBody = JSON.stringify({ idTrigger: mutation.data.idTrigger });
    return (
      <main className="page page--narrow">
        <div className="page__head">
          <h1>Trigger creado</h1>
        </div>
        <section className="panel panel--padded success">
          <p>
            El trigger queda <strong>activo</strong>. Cada vez que TradingView llame al webhook se crea una oportunidad
            (si no hay otra en curso o activa del mismo trigger).
          </p>
          <dl className="kv kv--wide">
            <dt>ID del trigger</dt>
            <dd className="copy-row">
              <code>{mutation.data.idTrigger}</code>
              <CopyButton text={mutation.data.idTrigger} />
            </dd>
            <dt>Webhook</dt>
            <dd className="copy-row">
              <code>POST {apiBaseUrl}/hook/trading_view</code>
            </dd>
            <dt>Body de la alerta</dt>
            <dd className="copy-row">
              <code>{hookBody}</code>
              <CopyButton text={hookBody} />
            </dd>
          </dl>
          <div className="form-actions">
            <button type="button" className="button button--primary" onClick={mutation.reset}>
              Crear otro trigger
            </button>
            <a className="button" href="#/">
              Ver oportunidades
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page page--narrow">
      <div className="page__head">
        <div>
          <h1>Nuevo trigger</h1>
          <p className="muted small">
            Un trigger es la senal (por ejemplo una alerta de TradingView) que abre oportunidades sobre un asset.
          </p>
        </div>
      </div>

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

        {mutation.error && <ErrorBanner error={mutation.error} />}

        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creando…' : 'Crear trigger'}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => {
              setValues(EMPTY_FORM);
              setClientErrors({});
              mutation.reset();
            }}
            disabled={mutation.isPending}
          >
            Limpiar
          </button>
        </div>
      </form>
    </main>
  );
}
