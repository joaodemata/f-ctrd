import type { ObjectId } from './opportunity';

// Espejo de models/triggers_model.go en C-TRD (tags json en camelCase). GET /list/triggers no retorna los campos de
// auditoria (logical_delete, core_db, ...)
export interface TriggerCondition {
  idCondition: ObjectId;
  idProvider: ObjectId;
  nameProvider: string;
  nameCondition: string;
  descriptionCondition: string;
}

export interface Trigger {
  id: ObjectId;
  tag: string;
  name: string;
  description: string;
  idAsset: ObjectId;
  tagAsset: string;
  asset: string;
  idAction: ObjectId;
  tagAction: string;
  action: string;
  idStatus: ObjectId;
  tagStatus: string;
  status: string;
  conditions: TriggerCondition[] | null;
  maxCandlestickQty: number;
  idCandlestickTimeframe: ObjectId;
  tagCandlestickTimeframe: string;
  candlestickTimeframe: string;
  // Version anterior y raiz de la cadena de versiones; null en un trigger que nunca se actualizo
  idReference: ObjectId | null;
  idReferenceRoot: ObjectId | null;
  pineCode: string | null;
  lastUpdatedAt: string;
  createdDate: string;
}

// Estados de un trigger (GENERIC_STATUS en common/constants.go). Al actualizar un trigger la version anterior
// queda Inactiva y borrada logicamente
export const TriggerStatusTag = {
  Active: 'STATUS-ACTIVE',
  Inactive: 'STATUS-INACTIVE',
} as const;

// ObjectID cero de Go: algunos triggers antiguos lo guardaron en lugar de null
const ZERO_OBJECT_ID = '000000000000000000000000';

function isSetObjectId(id: ObjectId | null): id is ObjectId {
  return !!id && id !== ZERO_OBJECT_ID;
}

// Id de la version anterior, o null si es la version original
export function previousTriggerId(trigger: Trigger): ObjectId | null {
  return isSetObjectId(trigger.idReference) ? trigger.idReference : null;
}

// Id de la version original, compartido por todas las versiones del trigger
export function triggerRootId(trigger: Trigger): ObjectId {
  return isSetObjectId(trigger.idReferenceRoot) ? trigger.idReferenceRoot : trigger.id;
}
