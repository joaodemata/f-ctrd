import { api } from './client';
import type { ApiResult } from './types';
import type { Condition } from '../models/condition';

// Query params de GET /list/conditions (format_validates/list_format_validate.go -> ListSearchFormat)
export interface ListConditionsParams {
  limit?: number; // 1 a 100
  page?: number;
  search?: string; // literal, C-TRD lo escapa
}

// `page` es el total de documentos que cumplen el filtro. Las mas recientes primero
export interface ListConditionsData {
  conditions: Condition[];
  page: number;
}

export function listConditions(
  params: ListConditionsParams,
  signal?: AbortSignal,
): Promise<ApiResult<ListConditionsData>> {
  return api.get<ListConditionsData>('/list/conditions', { query: { ...params }, signal });
}

// Body de POST /operation/create/condition (format_validates/operation_format_validate.go -> CreateConditionFormat).
// Los valores de los parametros van como texto; C-TRD los valida contra el dataType de la API (parameters) o del
// callback (parametersCallback). El tag es unico entre las condiciones no borradas (DVOPR020)
export interface CreateConditionBody {
  tag: string;
  name: string;
  description: string;
  idTypeCondition: string; // catalogo TYPE_CONDITION
  idApi: string;
  parameters: Record<string, string>;
  callbackFunction: string;
  parametersCallback: Record<string, string>;
  intervalSeconds: number; // minimo 60
}

export interface CreateConditionData {
  idCondition: string;
}

export function createCondition(body: CreateConditionBody, signal?: AbortSignal): Promise<ApiResult<CreateConditionData>> {
  return api.post<CreateConditionData>('/operation/create/condition', body, { signal });
}
