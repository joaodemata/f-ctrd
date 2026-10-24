import { useState, type FormEvent } from 'react';
import { listApis } from '../api/apis';
import { createCondition, type CreateConditionBody } from '../api/conditions';
import { useApiMutation } from '../hooks/useApiMutation';
import { useApiQuery } from '../hooks/useApiQuery';
import type { ApiDefinition } from '../models/apiDefinition';
import { CONDITION_MIN_INTERVAL_SECONDS } from '../models/condition';
import { formatDuration } from '../utils/format';
import { ApiParameterInput, validateParameterValue } from './ApiParameterInput';
import { CallbackSelect } from './CallbackSelect';
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
  api: ApiDefinition | null;
  parameters: Record<string, string>;
  callbackFunction: string;
  nameCondition: string;
  descriptionCondition: string;
  intervalSeconds: string;
}

const EMPTY_FORM: ConditionFormValues = {
  api: null,
  parameters: {},
  callbackFunction: '',
  nameCondition: '',
  descriptionCondition: '',
  intervalSeconds: '3600',
};

type FieldErrors = Partial<Record<keyof CreateConditionBody, string>>;

// Valores iniciales de los parametros: el default de la API o vacio
function defaultParameters(api: ApiDefinition): Record<string, string> {
  return Object.fromEntries(api.parameters.map((parameter) => [parameter.name, parameter.defaultValue ?? '']));
}

export function ConditionPage() {
  const [values, setValues] = useState<ConditionFormValues>(EMPTY_FORM);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [parameterErrors, setParameterErrors] = useState<Record<string, string>>({});
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
      parameters: api ? defaultParameters(api) : {},
      callbackFunction: '',
    }));
    setParameterErrors({});
  };

  const resetForm = () => {
    setValues(EMPTY_FORM);
    setClientErrors({});
    setParameterErrors({});
    setFormKey((key) => key + 1);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const { api } = values;

    const errors: FieldErrors = {};
    if (!api) errors.idApi = 'Elige una API.';
    if (!values.callbackFunction) errors.callbackFunction = 'Elige un callback.';
    if (!values.nameCondition.trim()) errors.nameCondition = 'El nombre es obligatorio.';
    if (!values.descriptionCondition.trim()) errors.descriptionCondition = 'La descripcion es obligatoria.';
    const interval = Number(values.intervalSeconds);
    if (!Number.isInteger(interval) || interval < CONDITION_MIN_INTERVAL_SECONDS) {
      errors.intervalSeconds = `Debe ser un entero de al menos ${CONDITION_MIN_INTERVAL_SECONDS} segundos.`;
    }

    const nextParameterErrors: Record<string, string> = {};
    for (const parameter of api?.parameters ?? []) {
      const message = validateParameterValue(parameter, values.parameters[parameter.name] ?? '');
      if (message) nextParameterErrors[parameter.name] = message;
    }

    setClientErrors(errors);
    setParameterErrors(nextParameterErrors);
    if (!api || Object.keys(errors).length > 0 || Object.keys(nextParameterErrors).length > 0) return;

    // Los parametros vacios no se envian: C-TRD usa el default de la API si lo tiene
    const parameters = Object.fromEntries(Object.entries(values.parameters).filter(([, value]) => value !== ''));

    const result = await mutation.run({
      idApi: api.id,
      nameCondition: values.nameCondition.trim(),
      descriptionCondition: values.descriptionCondition.trim(),
      parameters,
      callbackFunction: values.callbackFunction,
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
          <a className="button" href="#/triggers">
            Usarla en un trigger
          </a>
        </div>
      )}

      <form className="panel panel--padded form" onSubmit={handleSubmit} noValidate>
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
                <div className="form-grid">
                  {values.api.parameters.map((parameter) => (
                    <FormField
                      key={parameter.name}
                      label={parameter.label || parameter.name}
                      required={parameter.isRequired && parameter.defaultValue === null}
                      as={parameter.name === 'idAsset' ? 'fieldset' : 'label'}
                      error={parameterErrors[parameter.name]}
                      hint={
                        <>
                          {parameter.description}
                          {parameter.defaultValue !== null && ` Por defecto: ${parameter.defaultValue}.`}
                        </>
                      }
                    >
                      <ApiParameterInput
                        parameter={parameter}
                        value={values.parameters[parameter.name] ?? ''}
                        invalid={!!parameterErrors[parameter.name]}
                        onChange={(value) =>
                          setValues((current) => ({
                            ...current,
                            parameters: { ...current.parameters, [parameter.name]: value },
                          }))
                        }
                      />
                    </FormField>
                  ))}
                </div>
              )}
            </fieldset>

            <FormField label="Callback" required error={fieldError('callbackFunction')}>
              <CallbackSelect
                responseFormat={values.api.responseFormat}
                value={values.callbackFunction}
                onChange={(name) => set('callbackFunction', name)}
                invalid={!!fieldError('callbackFunction')}
              />
            </FormField>
          </>
        )}

        <div className="form-grid">
          <FormField label="Nombre" required error={fieldError('nameCondition')}>
            <input
              value={values.nameCondition}
              onChange={(event) => set('nameCondition', event.target.value)}
              placeholder="FED: bajada de tasa probable"
              maxLength={200}
              aria-invalid={!!fieldError('nameCondition')}
            />
          </FormField>
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
        </div>

        <FormField label="Descripcion" required error={fieldError('descriptionCondition')}>
          <textarea
            value={values.descriptionCondition}
            onChange={(event) => set('descriptionCondition', event.target.value)}
            rows={2}
            maxLength={1000}
            aria-invalid={!!fieldError('descriptionCondition')}
          />
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
