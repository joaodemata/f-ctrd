import { useState } from 'react';
import type { Asset } from '../models/asset';
import {
  ApiParameterOptionsSource,
  ApiParameterType,
  type ApiParameterOptions,
  type CallbackParameter,
} from '../models/apiDefinition';
import { AssetPicker } from './AssetPicker';

// Las APIs que leen datos por asset (ej: el CSV de Google Trends) reciben el id del asset como texto libre;
// se muestra el selector de assets en lugar de pedir el ObjectID
const ASSET_PARAMETER_NAME = 'idAsset';

// Parametro de una API (ApiParameter, sin rango) o de un callback (CallbackParameter, sin opciones)
export type ParameterDefinition = Omit<CallbackParameter, 'minValue' | 'maxValue'> &
  Partial<Pick<CallbackParameter, 'minValue' | 'maxValue'>> & { options?: ApiParameterOptions | null };

// Texto del rango del parametro, igual que callbackParameterRangeText en C-TRD. null si no tiene limites
export function parameterRangeText(parameter: ParameterDefinition): string | null {
  const min = parameter.minValue ?? null;
  const max = parameter.maxValue ?? null;
  if (min !== null && max !== null) return `entre ${min} y ${max}`;
  if (min !== null) return `mayor o igual a ${min}`;
  if (max !== null) return `menor o igual a ${max}`;
  return null;
}

interface ApiParameterInputProps {
  parameter: ParameterDefinition;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}

function AssetParameterInput({ onChange, invalid }: Pick<ApiParameterInputProps, 'onChange' | 'invalid'>) {
  const [asset, setAsset] = useState<Asset | null>(null);
  return (
    <AssetPicker
      value={asset}
      invalid={invalid}
      onChange={(next) => {
        setAsset(next);
        onChange(next?.id ?? '');
      }}
    />
  );
}

// Control del parametro segun sus opciones y su dataType. C-TRD recibe siempre texto y lo valida
export function ApiParameterInput({ parameter, value, onChange, invalid = false }: ApiParameterInputProps) {
  const { options } = parameter;
  const emptyLabel = parameter.isRequired ? 'Elige una opcion' : 'Sin valor';

  if (options?.source === ApiParameterOptionsSource.Static && options.values && options.values.length > 0) {
    return (
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid}>
        <option value="" disabled={parameter.isRequired}>
          {emptyLabel}
        </option>
        {options.values.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} ({option.value})
          </option>
        ))}
      </select>
    );
  }

  if (parameter.name === ASSET_PARAMETER_NAME) {
    return <AssetParameterInput onChange={onChange} invalid={invalid} />;
  }

  switch (parameter.dataType) {
    case ApiParameterType.Boolean:
      return (
        <select value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid}>
          <option value="" disabled={parameter.isRequired}>
            {emptyLabel}
          </option>
          <option value="true">Si (true)</option>
          <option value="false">No (false)</option>
        </select>
      );
    case ApiParameterType.Integer:
      return (
        <input
          type="number"
          inputMode="numeric"
          step={1}
          min={parameter.minValue ?? undefined}
          max={parameter.maxValue ?? undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid}
        />
      );
    case ApiParameterType.Float:
      return (
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min={parameter.minValue ?? undefined}
          max={parameter.maxValue ?? undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid}
        />
      );
    case ApiParameterType.Date:
      return <input type="date" value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid} />;
    default:
      return <input value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={invalid} />;
  }
}

// Validacion local equivalente a parseParameterValue en C-TRD. Retorna el mensaje o null si es valido
export function validateParameterValue(parameter: ParameterDefinition, value: string): string | null {
  if (value === '') {
    return parameter.isRequired && parameter.defaultValue === null ? 'Este parametro es obligatorio.' : null;
  }
  switch (parameter.dataType) {
    case ApiParameterType.Integer:
      return /^-?\d+$/.test(value) ? validateParameterRange(parameter, Number(value)) : 'Debe ser un numero entero.';
    case ApiParameterType.Float:
      return value.trim() !== '' && Number.isFinite(Number(value))
        ? validateParameterRange(parameter, Number(value))
        : 'Debe ser un numero.';
    case ApiParameterType.Boolean:
      return value === 'true' || value === 'false' ? null : 'Debe ser true o false.';
    case ApiParameterType.Date:
      return /^\d{4}-\d{2}-\d{2}$/.test(value) ? null : 'Debe tener el formato YYYY-MM-DD.';
  }
  return null;
}

// Rango inclusivo [minValue, maxValue], equivalente a validateCallbackParameterRange en C-TRD
function validateParameterRange(parameter: ParameterDefinition, number: number): string | null {
  const belowMin = parameter.minValue != null && number < parameter.minValue;
  const aboveMax = parameter.maxValue != null && number > parameter.maxValue;
  return belowMin || aboveMax ? `Debe estar ${parameterRangeText(parameter)}.` : null;
}
