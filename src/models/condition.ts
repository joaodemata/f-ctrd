import type { ObjectId } from './opportunity';
import type { RecordOwner } from './user';
import type { RecordVisibility } from './visibility';

// Espejo de models/conditions_model.go en C-TRD. Tags json en camelCase. C-TRD no envia la peticion (httpRequest)
// ni la metadata, y GET /list/conditions no proyecta el lock del cronjob. Tampoco proyecta el usuario ni la
// visibilidad: llegan con el valor cero (id cero, textos vacios, allowedUsers null), ver hasVisibility
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

// Intervalo minimo al crear una condicion (ConditionMinIntervalSeconds en common/constants.go)
export const CONDITION_MIN_INTERVAL_SECONDS = 60;
