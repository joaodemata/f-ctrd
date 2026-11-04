import type { ObjectId } from './opportunity';
import type { RecordOwner } from './user';
import type { RecordVisibility } from './visibility';

// Espejo de models/conditions_model.go en C-TRD. Tags json en camelCase. C-TRD no envia la peticion (httpRequest)
// ni la metadata, y GET /list/conditions no proyecta el lock del cronjob. Del usuario solo proyecta idUser y no
// proyecta la visibilidad: llegan con el valor cero (id cero, textos vacios, allowedUsers null), ver hasVisibility.
// Las que crea un agente nacen Pendientes de aprobacion (ConditionReviewStatusTag)
export interface Condition extends RecordOwner, RecordVisibility {
  id: ObjectId;
  tag: string;
  name: string;
  description: string;
  idProvider: ObjectId;
  nameProvider: string;
  // Catalogo TYPE_CONDITION que clasifica la condicion. Las condiciones anteriores a la clasificacion no lo tienen
  idTypeCondition: ObjectId;
  nameTypeCondition: string;
  tagTypeCondition: string;
  isWebhookOnly: boolean;
  nextExecutionAt: string | null;
  intervalSeconds: number | null;
  lastExecutedAt: string | null;
  idApi: ObjectId;
  callbackFunction: string;
  // Valores ya tipados (numero, booleano, texto) de los parametros del callback; {} si no tiene
  parametersCallback: Record<string, unknown> | null;
  idStatus: ObjectId;
  tagStatus: string;
  status: string;
  createdDate: string;
}

// Estados de revision de las condiciones que crea un agente (GENERIC_STATUS). Aprobada pasa a Inactiva y el cronjob
// empieza a evaluarla; rechazada se conserva pero ningun trigger nuevo o aprobado puede usarla (DVOPR043)
export const ConditionReviewStatusTag = {
  PendingForApprove: 'STATUS-PENDING-FOR-APPROVE',
  NotApproved: 'STATUS-NOT-APPROVED',
} as const;

// Intervalo minimo al crear una condicion (ConditionMinIntervalSeconds en common/constants.go)
export const CONDITION_MIN_INTERVAL_SECONDS = 60;
