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
  private: { id: '6ae515f8b1bb56b09f96ce26', tag: 'VISIBILITY_PRIVATE', name: 'Privado' },
  public: { id: '6ae5164cb1bb56b09f96ce28', tag: 'VISIBILITY_PUBLIC', name: 'Público' },
  whitelist: { id: '6ae5168eb1bb56b09f96ce29', tag: 'VISIBILITY_WHITELIST', name: 'Lista privada' },
} as const;

export function hasVisibility(record: RecordVisibility): boolean {
  return record.tagTypeVisibility !== '';
}

// Nombre para mostrar; sin visibilidad (registro anterior) nadie lo ve en los listados filtrados
export function visibilityLabel(record: RecordVisibility): string {
  if (!hasVisibility(record)) return 'Sin visibilidad';
  return record.nameTypeVisibility || record.tagTypeVisibility;
}
