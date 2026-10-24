import { api } from './client';
import type { ApiResult } from './types';

// Body de POST /operation/create/trigger (format_validates/operation_format_validate.go -> CreateTriggerFormat)
export interface CreateTriggerBody {
  tag: string; // unico entre los triggers
  name: string;
  description: string;
  idAsset: string;
  idAction: string; // catalogo TYPE_ACTION
  conditions?: string[]; // ids sin repetir, en el orden en que se evaluan
  idCandlestickTimeframe: string; // catalogo TYPE_CANDLE_STICK
  maxCandlestickQty: number; // mayor a 0
}

export interface CreateTriggerData {
  idTrigger: string;
}

export function createTrigger(body: CreateTriggerBody, signal?: AbortSignal): Promise<ApiResult<CreateTriggerData>> {
  return api.post<CreateTriggerData>('/operation/create/trigger', body, { signal });
}
