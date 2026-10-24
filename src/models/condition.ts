import type { ObjectId } from './opportunity';

// Espejo de models/conditions_model.go en C-TRD. Los tags json mezclan camelCase y snake_case, se mantienen igual.
// GET /list/conditions no proyecta la peticion (http_request) ni el lock del cronjob
export interface Condition {
  id: ObjectId;
  idProvider: ObjectId;
  nameProvider: string;
  nameCondition: string;
  descriptionCondition: string;
  metadata: unknown;
  is_webhook_only: boolean;
  next_execution_at: string | null;
  interval_seconds: number | null;
  last_executed_at: string | null;
  idApi: ObjectId;
  callbackFunction: string;
  id_status: ObjectId;
  tag_status: string;
  status: string;
  created_date: string;
}

// Intervalo minimo al crear una condicion (ConditionMinIntervalSeconds en common/constants.go)
export const CONDITION_MIN_INTERVAL_SECONDS = 60;
