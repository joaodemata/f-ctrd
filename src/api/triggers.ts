import { api } from './client';
import type { ApiResult, VisibilityBody } from './types';
import type { Trigger } from '../models/trigger';

// Query params de GET /list/triggers (common/format_validations.go -> PaginationFormat +
// format_validates/list_format_validate.go -> ListTriggersFormat)
export interface ListTriggersParams {
  limit?: number; // 1 a 100
  page?: number;
  search?: string; // literal, C-TRD lo escapa
  startDate?: string; // YYYY-MM-DD, filtra created_date
  endDate?: string; // YYYY-MM-DD
  // Sin showReferences solo se listan los activos; con showReferences tambien los inactivos y los reemplazados.
  // tagStatus distinto de activo sin showReferences responde DVLIS003
  tagStatus?: string;
  showReferences?: boolean;
  // Solo las versiones de un trigger: la raiz y las que la tienen como idReferenceRoot. Con showReferences
  // incluye las inactivas
  idReferenceRoot?: string;
}

// Los mas recientes primero. `page` es el total de documentos que cumplen el filtro
export interface ListTriggersData {
  triggers: Trigger[];
  page: number;
}

export function listTriggers(params: ListTriggersParams, signal?: AbortSignal): Promise<ApiResult<ListTriggersData>> {
  return api.get<ListTriggersData>('/list/triggers', { query: { ...params }, signal });
}

// Datos del trigger comunes a crear y actualizar (format_validates/operation_format_validate.go -> CreateTriggerFormat)
export interface TriggerFields {
  tag: string; // unico entre los triggers
  name: string;
  description: string;
  idAsset: string;
  idAction: string; // catalogo TYPE_ACTION
  conditions?: string[]; // ids sin repetir, en el orden en que se evaluan
  idCandlestickTimeframe: string; // catalogo TYPE_CANDLE_STICK
  maxCandlestickQty: number; // mayor a 0
}

// Body de POST /operation/create/trigger: el trigger queda a nombre del usuario de la sesion (solo super usuario)
// con la visibilidad enviada
export type CreateTriggerBody = TriggerFields & VisibilityBody;

// idWebhook es el id que va en la alerta de TradingView; se mantiene entre las versiones del trigger
export interface CreateTriggerData {
  idTrigger: string;
  idWebhook: string;
}

export function createTrigger(body: CreateTriggerBody, signal?: AbortSignal): Promise<ApiResult<CreateTriggerData>> {
  return api.post<CreateTriggerData>('/operation/create/trigger', body, { signal });
}

// Body de PUT /operation/update/trigger (UpdateTriggerFormat): el trigger a reemplazar y todos los datos de la
// version nueva, con las mismas reglas que al crear. El tag puede ser el mismo del trigger anterior. El usuario y la
// visibilidad no se envian: la version nueva conserva los del trigger anterior
export interface UpdateTriggerBody extends TriggerFields {
  idTrigger: string;
}

// C-TRD no edita el documento: borra el anterior (queda Inactivo) y crea uno nuevo con otro id que lo referencia.
// El pine_code y el idWebhook se conservan, asi que la alerta de TradingView no cambia
export interface UpdateTriggerData {
  idTrigger: string;
  idPreviousTrigger: string;
  idReferenceRoot: string;
  idWebhook: string;
}

export function updateTrigger(body: UpdateTriggerBody, signal?: AbortSignal): Promise<ApiResult<UpdateTriggerData>> {
  return api.put<UpdateTriggerData>('/operation/update/trigger', body, { signal });
}
