import { useState, type FormEvent } from 'react';
import { listApis } from '../api/apis';
import { createCondition, type CreateConditionBody } from '../api/conditions';
import { useApiMutation } from '../hooks/useApiMutation';
import { useApiQuery } from '../hooks/useApiQuery';
import type { ApiDefinition, CallbackInfo } from '../models/apiDefinition';
import { CatalogType, type Catalog } from '../models/catalog';
import { CONDITION_MIN_INTERVAL_SECONDS } from '../models/condition';
import { formatDuration } from '../utils/format';
import {
  ApiParameterInput,
  parameterRangeText,
  validateParameterValue,
  type ParameterDefinition,
} from './ApiParameterInput';
import { CallbackSelect } from './CallbackSelect';
import { CatalogSelect } from './CatalogSelect';
import { ConditionsTable } from './ConditionsTable';
import { CopyButton } from './CopyButton';
import { ErrorBanner } from './ErrorBanner';
import { FormField } from './FormField';

// C-TRD limita el listado de APIs a 100 por pagina; hoy hay pocas y caben en un select
const API_LIMIT = 100;

const INTERVAL_PRESETS = [
  { seconds: 60, label: '1 min' },
  { seconds: 900, label: '15 min' },
  { seconds: 3600, label: '1 h' },
  { seconds: 86400, label: '1 dia' },
];

interface ConditionFormValues {
  tag: string;
  name: string;
  description: string;
  typeCondition: Catalog | null;
  api: ApiDefinition | null;
  parameters: Record<string, string>;
  callback: CallbackInfo | null;
  parametersCallback: Record<string, string>;
  intervalSeconds: string;
}

const EMPTY_FORM: ConditionFormValues = {
  tag: '',
  name: '',
  description: '',
  typeCondition: null,
  api: null,
  parameters: {},
  callback: null,
  parametersCallback: {},
  intervalSeconds: '3600',
};

type FieldErrors = Partial<Record<keyof CreateConditionBody, string>>;

// Valores iniciales de los parametros (de la API o del callback): el default o vacio
function defaultParameters(parameters: ParameterDefinition[]): Record<string, string> {
  return Object.fromEntries(parameters.map((parameter) => [parameter.name, parameter.defaultValue ?? '']));
}

function validateParameters(parameters: ParameterDefinition[], values: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const parameter of parameters) {
    const message = validateParameterValue(parameter, values[parameter.name] ?? '');
    if (message) errors[parameter.name] = message;
  }
  return errors;
}

// Los parametros vacios no se envian: C-TRD usa el default si lo tiene
function filledParameters(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''));
}

interface ParameterFieldsProps {
  parameters: ParameterDefinition[];
  values: Record<string, string>;
  errors: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

// Un campo por parametro, segun su tipo de dato y sus opciones
function ParameterFields({ parameters, values, errors, onChange }: ParameterFieldsProps) {
  return (
    <div className="form-grid">
      {parameters.map((parameter) => (
        <FormField
          key={parameter.name}
          label={parameter.label || parameter.name}
          required={parameter.isRequired && parameter.defaultValue === null}
          as={parameter.name === 'idAsset' ? 'fieldset' : 'label'}
          error={errors[parameter.name]}
          hint={
            <>
              {parameter.description}
              {parameterRangeText(parameter) && ` Valor ${parameterRangeText(parameter)}.`}
              {parameter.defaultValue !== null && ` Por defecto: ${parameter.defaultValue}.`}
            </>
          }
        >
          <ApiParameterInput
            parameter={parameter}
            value={values[parameter.name] ?? ''}
            invalid={!!errors[parameter.name]}
            onChange={(value) => onChange(parameter.name, value)}
          />
        </FormField>
      ))}
    </div>
  );
}

export function ConditionPage() {
  const [values, setValues] = useState<ConditionFormValues>(EMPTY_FORM);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [parameterErrors, setParameterErrors] = useState<Record<string, string>>({});
  const [callbackParameterErrors, setCallbackParameterErrors] = useState<Record<string, string>>({});
  // Cambia al crear o limpiar: remonta los parametros (estado interno del selector de assets) y refresca el listado
  const [formKey, setFormKey] = useState(0);
  const mutation = useApiMutation(createCondition);

  const apis = useApiQuery((signal) => listApis({ limit: API_LIMIT }, signal), []);
  const apiOptions = apis.data?.apis ?? [];

  const set = <K extends keyof ConditionFormValues>(key: K, value: ConditionFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const fieldError = (field: keyof CreateConditionBody) => clientErrors[field] ?? mutation.error?.fieldErrors[field];

  const selectApi = (id: string) => {
    const api = apiOptions.find((item) => item.id === id) ?? null;
    setValues((current) => ({
      ...current,
      api,
      parameters: api ? defaultParameters(api.parameters) : {},
      callback: null,
      parametersCallback: {},
    }));
    setParameterErrors({});
    setCallbackParameterErrors({});
  };

  const selectCallback = (callback: CallbackInfo | null) => {
    setValues((current) => ({
      ...current,
      callback,
      parametersCallback: callback ? defaultParameters(callback.parameters) : {},
    }));
    setCallbackParameterErrors({});
  };

  const resetForm = () => {
    setValues(EMPTY_FORM);
    setClientErrors({});
    setParameterErrors({});
    setCallbackParameterErrors({});
    setFormKey((key) => key + 1);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const { api, callback, typeCondition } = values;

    const errors: FieldErrors = {};
    if (!values.tag.trim()) errors.tag = 'El tag es obligatorio.';
    if (!values.name.trim()) errors.name = 'El nombre es obligatorio.';
    if (!values.description.trim()) errors.description = 'La descripcion es obligatoria.';
    if (!typeCondition) errors.idTypeCondition = 'Elige un tipo de condicion.';
    if (!api) errors.idApi = 'Elige una API.';
    if (!callback) errors.callbackFunction = 'Elige un callback.';
    const interval = Number(values.intervalSeconds);
    if (!Number.isInteger(interval) || interval < CONDITION_MIN_INTERVAL_SECONDS) {
      errors.intervalSeconds = `Debe ser un entero de al menos ${CONDITION_MIN_INTERVAL_SECONDS} segundos.`;
    }

    const nextParameterErrors = validateParameters(api?.parameters ?? [], values.parameters);
    const nextCallbackParameterErrors = validateParameters(callback?.parameters ?? [], values.parametersCallback);

    setClientErrors(errors);
    setParameterErrors(nextParameterErrors);
    setCallbackParameterErrors(nextCallbackParameterErrors);
    if (
      !api ||
      !callback ||
      !typeCondition ||
      Object.keys(errors).length > 0 ||
      Object.keys(nextParameterErrors).length > 0 ||
      Object.keys(nextCallbackParameterErrors).length > 0
    ) {
      return;
    }

    const result = await mutation.run({
      tag: values.tag.trim(),
      name: values.name.trim(),
      description: values.description.trim(),
      idTypeCondition: typeCondition.id,
      idApi: api.id,
      parameters: filledParameters(values.parameters),
      callbackFunction: callback.id,
      parametersCallback: filledParameters(values.parametersCallback),
      intervalSeconds: interval,
    });
    if (result.ok) resetForm();
  };

  const interval = Number(values.intervalSeconds);
  const intervalHint =
    Number.isInteger(interval) && interval >= CONDITION_MIN_INTERVAL_SECONDS
      ? `Se evalua cada ${formatDuration(Math.round(interval / 60))}. El cronjob corre cada minuto.`
      : `Minimo ${CONDITION_MIN_INTERVAL_SECONDS} segundos: el cronjob corre cada minuto.`;

  return (
    <main className="page">
      <div className="page__head">
        <div>
          <h1>Nueva condicion</h1>
          <p className="muted small">
            Una condicion consulta una API de forma periodica y un callback decide si se cumple. Se asignan a los
            triggers.
          </p>
        </div>
      </div>

      {mutation.data && (
        <div className="success-banner" role="status">
          <div>
            <strong>Condicion creada.</strong> Queda <em>Inactiva</em> hasta que el cronjob la evalue y se cumpla.
            <div className="copy-row">
              <code>{mutation.data.idCondition}</code>
              <CopyButton text={mutation.data.idCondition} />
            </div>
          </div>
          <a className="button" href="#/triggers/nuevo">
            Usarla en un trigger
          </a>
        </div>
      )}

      <form className="panel panel--padded form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <FormField label="Tag" required error={fieldError('tag')} hint="Identificador unico de la condicion.">
            <input
              value={values.tag}
              onChange={(event) => set('tag', event.target.value)}
              placeholder="FED_RATE_HIKE_LIKELY"
              maxLength={100}
              aria-invalid={!!fieldError('tag')}
            />
          </FormField>
          <FormField label="Nombre" required error={fieldError('name')}>
            <input
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
              placeholder="FED: bajada de tasa probable"
              maxLength={200}
              aria-invalid={!!fieldError('name')}
            />
          </FormField>
          <FormField
            label="Tipo"
            required
            error={fieldError('idTypeCondition')}
            hint={values.typeCondition?.description}
          >
            <CatalogSelect
              type={CatalogType.Condition}
              value={values.typeCondition}
              onChange={(catalog) => set('typeCondition', catalog)}
              placeholder="Elige un tipo"
              invalid={!!fieldError('idTypeCondition')}
            />
          </FormField>
        </div>

        <FormField label="Descripcion" required error={fieldError('description')}>
          <textarea
            value={values.description}
            onChange={(event) => set('description', event.target.value)}
            rows={2}
            maxLength={1000}
            aria-invalid={!!fieldError('description')}
          />
        </FormField>

        <FormField label="API" required error={fieldError('idApi')}>
          <select
            value={values.api?.id ?? ''}
            onChange={(event) => selectApi(event.target.value)}
            disabled={apis.isLoading}
            aria-invalid={!!fieldError('idApi')}
          >
            <option value="" disabled>
              {apis.isLoading ? 'Cargando…' : apiOptions.length === 0 ? 'No hay APIs activas' : 'Elige una API'}
            </option>
            {apiOptions.map((api) => (
              <option key={api.id} value={api.id}>
                {api.name} · {api.nameProvider}
              </option>
            ))}
          </select>
          {values.api?.description && <span className="form-field__hint">{values.api.description}</span>}
        </FormField>
        {apis.error && <ErrorBanner error={apis.error} onRetry={apis.refetch} stale={!!apis.data} />}

        {values.api && (
          <>
            <fieldset className="form-section" key={`${values.api.id}-${formKey}`}>
              <legend>Parametros</legend>
              {values.api.parameters.length === 0 ? (
                <p className="muted small">Esta API no tiene parametros.</p>
              ) : (
                <ParameterFields
                  parameters={values.api.parameters}
                  values={values.parameters}
                  errors={parameterErrors}
                  onChange={(name, value) =>
                    setValues((current) => ({ ...current, parameters: { ...current.parameters, [name]: value } }))
                  }
                />
              )}
            </fieldset>

            <FormField label="Callback" required error={fieldError('callbackFunction')}>
              <CallbackSelect
                responseFormat={values.api.responseFormat}
                value={values.callback?.id ?? ''}
                onChange={selectCallback}
                invalid={!!fieldError('callbackFunction')}
              />
            </FormField>

            {values.callback && values.callback.parameters.length > 0 && (
              <fieldset className="form-section" key={`${values.callback.id}-${formKey}`}>
                <legend>Parametros del callback</legend>
                <ParameterFields
                  parameters={values.callback.parameters}
                  values={values.parametersCallback}
                  errors={callbackParameterErrors}
                  onChange={(name, value) =>
                    setValues((current) => ({
                      ...current,
                      parametersCallback: { ...current.parametersCallback, [name]: value },
                    }))
                  }
                />
              </fieldset>
            )}
          </>
        )}

        <FormField label="Intervalo (segundos)" required error={fieldError('intervalSeconds')} hint={intervalHint}>
          <input
            type="number"
            inputMode="numeric"
            min={CONDITION_MIN_INTERVAL_SECONDS}
            step={1}
            value={values.intervalSeconds}
            onChange={(event) => set('intervalSeconds', event.target.value)}
            aria-invalid={!!fieldError('intervalSeconds')}
          />
          <span className="presets">
            {INTERVAL_PRESETS.map((preset) => (
              <button
                key={preset.seconds}
                type="button"
                className="button button--small"
                aria-pressed={interval === preset.seconds}
                onClick={() => set('intervalSeconds', String(preset.seconds))}
              >
                {preset.label}
              </button>
            ))}
          </span>
        </FormField>

        {mutation.error && <ErrorBanner error={mutation.error} />}

        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creando…' : 'Crear condicion'}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => {
              resetForm();
              mutation.reset();
            }}
            disabled={mutation.isPending}
          >
            Limpiar
          </button>
        </div>
      </form>

      <ConditionsTable refreshKey={formKey} />
    </main>
  );
}
