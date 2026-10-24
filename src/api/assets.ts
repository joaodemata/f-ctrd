import { api } from './client';
import type { ApiResult } from './types';
import type { Asset } from '../models/asset';

// Query params de GET /list/assets (format_validates/list_format_validate.go -> ListSearchFormat)
export interface ListAssetsParams {
  limit?: number; // 1 a 100
  page?: number;
  search?: string; // literal, C-TRD lo escapa
}

// `page` es el total de documentos que cumplen el filtro
export interface ListAssetsData {
  assets: Asset[];
  page: number;
}

export function listAssets(params: ListAssetsParams, signal?: AbortSignal): Promise<ApiResult<ListAssetsData>> {
  return api.get<ListAssetsData>('/list/assets', { query: { ...params }, signal });
}
