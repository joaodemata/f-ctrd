import { api } from './client';
import type { ApiResult } from './types';
import type { ApiDefinition } from '../models/apiDefinition';

// Query params de GET /list/apis (format_validates/list_format_validate.go -> ListApisFormat)
export interface ListApisParams {
  limit?: number; // 1 a 100
  page?: number;
  search?: string; // literal, C-TRD lo escapa
  startDate?: string;
  endDate?: string;
}

// Solo APIs activas. `page` es el total de documentos que cumplen el filtro
export interface ListApisData {
  apis: ApiDefinition[];
  page: number;
}

export function listApis(params: ListApisParams, signal?: AbortSignal): Promise<ApiResult<ListApisData>> {
  return api.get<ListApisData>('/list/apis', { query: { ...params }, signal });
}
