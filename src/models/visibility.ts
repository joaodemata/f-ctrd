import { t } from '../i18n/language';
import type { ObjectId } from './opportunity';

// Espejo de RecordVisibilityData (models/catalogs_model.go): quien puede ver un trigger, condicion u oportunidad
// (catalogo TYPE_VISIBILITY). Va inline en los modelos. allowedUsers solo tiene usuarios en la lista blanca; los
// registros anteriores a la visibilidad traen el id cero, textos vacios y allowedUsers null, ver hasVisibility
export interface RecordVisibility {
  idTypeVisibility: ObjectId;
  tagTypeVisibility: string;
  nameTypeVisibility: string;
  descriptionTypeVisibility: string;
  allowedUsers: ObjectId[] | null;
}

// common/constants.go -> VisibilityPrivate / VisibilityPublic / VisibilityWhitelist. C-TRD filtra por el tag
export const VISIBILITY = {
  private: { id: '6ae515f8b1bb56b09f96ce26', tag: 'VISIBILITY_PRIVATE', label: { es: 'Privado', en: 'Private' } },
  public: { id: '6ae5164cb1bb56b09f96ce28', tag: 'VISIBILITY_PUBLIC', label: { es: 'Público', en: 'Public' } },
  whitelist: {
    id: '6ae5168eb1bb56b09f96ce29',
    tag: 'VISIBILITY_WHITELIST',
    label: { es: 'Lista privada', en: 'Private list' },
  },
} as const;

export function hasVisibility(record: RecordVisibility): boolean {
  return record.tagTypeVisibility !== '';
}

// Nombre para mostrar; sin visibilidad (registro anterior) nadie lo ve en los listados filtrados. Los tags conocidos
// se traducen; uno nuevo muestra el nombre del catalogo de C-TRD
export function visibilityLabel(record: RecordVisibility): string {
  if (!hasVisibility(record)) return t('Sin visibilidad', 'No visibility');
  const known = Object.values(VISIBILITY).find((item) => item.tag === record.tagTypeVisibility);
  if (known) return t(known.label);
  return record.nameTypeVisibility || record.tagTypeVisibility;
}
