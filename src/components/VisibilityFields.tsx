import type { ReactNode } from 'react';
import type { ApiError } from '../api/errors';
import type { VisibilityBody } from '../api/types';
import { CatalogType, type Catalog } from '../models/catalog';
import { VISIBILITY } from '../models/visibility';
import { CatalogSelect } from './CatalogSelect';
import { FormField } from './FormField';

type CatalogOption = Pick<Catalog, 'id' | 'tag' | 'name'>;

export interface VisibilityFormValues {
  visibility: CatalogOption | null;
  // Ids de usuario tal como se escriben: separados por coma, espacio o salto de linea
  allowedUsers: string;
}

// Privado por defecto: el registro no se comparte hasta que se elija otra visibilidad
export const EMPTY_VISIBILITY_FORM: VisibilityFormValues = { visibility: VISIBILITY.private, allowedUsers: '' };

export type VisibilityFieldErrors = Partial<Record<keyof VisibilityBody, string>>;

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/;

const VISIBILITY_HINTS: Readonly<Record<string, string>> = {
  [VISIBILITY.private.tag]: 'Solo lo ve tu usuario.',
  [VISIBILITY.public.tag]: 'Lo ven todos, tambien quienes entran sin sesion.',
  [VISIBILITY.whitelist.tag]: 'Lo ven tu usuario y los usuarios de la lista.',
};

function isWhitelist(values: VisibilityFormValues): boolean {
  return values.visibility?.tag === VISIBILITY.whitelist.tag;
}

// Ids sin repetir y en minusculas; C-TRD rechaza los repetidos
function parseUserIds(text: string): string[] {
  const ids = text
    .split(/[\s,;]+/)
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(ids)];
}

// Mismas reglas que VisibilityFormat y NewRecordVisibilityData en C-TRD
export function validateVisibility(values: VisibilityFormValues): VisibilityFieldErrors {
  const errors: VisibilityFieldErrors = {};
  if (!values.visibility) {
    errors.idTypeVisibility = 'Elige una visibilidad.';
    return errors;
  }
  if (isWhitelist(values)) {
    const ids = parseUserIds(values.allowedUsers);
    const invalid = ids.filter((id) => !OBJECT_ID_PATTERN.test(id));
    if (ids.length === 0) errors.allowedUsers = 'La lista privada necesita al menos un usuario.';
    else if (invalid.length > 0) errors.allowedUsers = `Ids invalidos: ${invalid.join(', ')}.`;
  }
  return errors;
}

// Llamar solo despues de validateVisibility sin errores. Fuera de la lista blanca no se envian usuarios
export function visibilityBody(values: VisibilityFormValues): VisibilityBody {
  if (!values.visibility) throw new Error('visibilityBody sin visibilidad elegida');
  return isWhitelist(values)
    ? { idTypeVisibility: values.visibility.id, allowedUsers: parseUserIds(values.allowedUsers) }
    : { idTypeVisibility: values.visibility.id };
}

// Errores por campo de C-TRD; los de la lista llegan por posicion (allowedUsers[0])
export function visibilityServerErrors(error: ApiError | undefined): VisibilityFieldErrors {
  if (!error) return {};
  const errors: VisibilityFieldErrors = {};
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if (field === 'idTypeVisibility') errors.idTypeVisibility = message;
    else if (field === 'allowedUsers' || field.startsWith('allowedUsers[')) {
      errors.allowedUsers = errors.allowedUsers ? `${errors.allowedUsers} ${message}` : message;
    }
  }
  return errors;
}

interface VisibilityFieldsProps {
  values: VisibilityFormValues;
  onChange: (values: VisibilityFormValues) => void;
  errors: VisibilityFieldErrors;
  disabled?: boolean;
  // Texto extra bajo la visibilidad (ej: que las oportunidades del trigger la copian)
  note?: ReactNode;
}

// Visibilidad del catalogo TYPE_VISIBILITY y, con la lista blanca, los usuarios que pueden ver el registro
export function VisibilityFields({ values, onChange, errors, disabled = false, note }: VisibilityFieldsProps) {
  const hint = values.visibility ? VISIBILITY_HINTS[values.visibility.tag] : undefined;

  return (
    <div className="form-grid">
      <FormField
        label="Visibilidad"
        required
        error={errors.idTypeVisibility}
        hint={
          <>
            {hint}
            {note && <> {note}</>}
          </>
        }
      >
        <CatalogSelect
          type={CatalogType.Visibility}
          value={values.visibility}
          onChange={(visibility) => onChange({ ...values, visibility })}
          placeholder="Elige una visibilidad"
          disabled={disabled}
          invalid={!!errors.idTypeVisibility}
        />
      </FormField>
      {isWhitelist(values) && (
        <FormField
          label="Usuarios de la lista"
          required
          error={errors.allowedUsers}
          hint="Ids de usuario (24 caracteres hexadecimales) separados por coma o salto de linea. Deben estar activos."
        >
          <textarea
            value={values.allowedUsers}
            onChange={(event) => onChange({ ...values, allowedUsers: event.target.value })}
            rows={3}
            spellCheck={false}
            placeholder="Un id por linea"
            disabled={disabled}
            aria-invalid={!!errors.allowedUsers}
          />
        </FormField>
      )}
    </div>
  );
}
