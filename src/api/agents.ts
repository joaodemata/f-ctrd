import { api } from './client';
import type { ApiResult } from './types';
import type { AgentRun, AgentThesis, ReviewDecision } from '../models/agent';

// Rutas de los agentes para el super usuario (routers/list_route.go y routers/operation_route.go). Las de la
// corrida (/operation/agent/start_run y finish_run) son del usuario agente y el frontend no las usa

// Query params de GET /list/agent_theses (PaginationFormat + ListAgentThesesFormat)
export interface ListAgentThesesParams {
  limit?: number; // 1 a 100
  page?: number;
  search?: string; // literal, C-TRD lo escapa (tesis, tag y nombre del asset)
  tagStatus?: string; // AGENT_THESIS_STATUS, vacio lista todas
}

// Las mas antiguas primero (orden FIFO de la cola). `page` es el total de documentos que cumplen el filtro
export interface ListAgentThesesData {
  theses: AgentThesis[];
  page: number;
}

export function listAgentTheses(
  params: ListAgentThesesParams,
  signal?: AbortSignal,
): Promise<ApiResult<ListAgentThesesData>> {
  return api.get<ListAgentThesesData>('/list/agent_theses', { query: { ...params }, signal });
}

// Query params de GET /list/agent_runs (PaginationFormat + ListAgentRunsFormat)
export interface ListAgentRunsParams {
  limit?: number;
  page?: number;
  search?: string; // literal (tesis, tag y nombre del asset)
  tagStatus?: string; // AGENT_RUN_STATUS
  idThesis?: string; // solo las corridas de una tesis
}

// Las mas recientes primero. `page` es el total de documentos que cumplen el filtro
export interface ListAgentRunsData {
  runs: AgentRun[];
  page: number;
}

export function listAgentRuns(params: ListAgentRunsParams, signal?: AbortSignal): Promise<ApiResult<ListAgentRunsData>> {
  return api.get<ListAgentRunsData>('/list/agent_runs', { query: { ...params }, signal });
}

// Body de POST /operation/create/agent_thesis (CreateAgentThesisFormat)
export interface CreateAgentThesisBody {
  idAsset: string;
  idAction: string; // catalogo TYPE_ACTION
  thesis: string; // 20 a 2000 caracteres
}

export interface CreateAgentThesisData {
  idThesis: string;
}

export function createAgentThesis(
  body: CreateAgentThesisBody,
  signal?: AbortSignal,
): Promise<ApiResult<CreateAgentThesisData>> {
  return api.post<CreateAgentThesisData>('/operation/create/agent_thesis', body, { signal });
}

// PUT /operation/delete/agent_thesis: borrado logico, solo de tesis pendientes (DVOPR030)
export interface DeleteAgentThesisBody {
  idThesis: string;
}

export interface DeleteAgentThesisData {
  idThesis: string;
}

export function deleteAgentThesis(
  body: DeleteAgentThesisBody,
  signal?: AbortSignal,
): Promise<ApiResult<DeleteAgentThesisData>> {
  return api.put<DeleteAgentThesisData>('/operation/delete/agent_thesis', body, { signal });
}

// PUT /operation/review/condition: solo condiciones pendientes de aprobacion (DVOPR038). No se puede rechazar una
// condicion que usa un trigger no rechazado (DVOPR039). Aprobada queda Inactiva y el cronjob empieza a evaluarla
export interface ReviewConditionBody {
  idCondition: string;
  decision: ReviewDecision;
}

export interface ReviewConditionData {
  idCondition: string;
  decision: ReviewDecision;
}

export function reviewCondition(
  body: ReviewConditionBody,
  signal?: AbortSignal,
): Promise<ApiResult<ReviewConditionData>> {
  return api.put<ReviewConditionData>('/operation/review/condition', body, { signal });
}

// PUT /operation/review/trigger: solo triggers pendientes (DVOPR042). Aprobarlo lo deja Activo y aprueba sus
// condiciones pendientes; no se puede aprobar si alguna condicion fue rechazada (DVOPR044)
export interface ReviewTriggerBody {
  idTrigger: string;
  decision: ReviewDecision;
}

export interface ReviewTriggerData {
  idTrigger: string;
  decision: ReviewDecision;
}

export function reviewTrigger(body: ReviewTriggerBody, signal?: AbortSignal): Promise<ApiResult<ReviewTriggerData>> {
  return api.put<ReviewTriggerData>('/operation/review/trigger', body, { signal });
}
