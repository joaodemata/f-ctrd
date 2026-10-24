import { api } from './client';
import type { ApiResult } from './types';
import type { Opportunity } from '../models/opportunity';

// Query params de GET /list/opportunities (common/format_validations.go -> PaginationFormat)
export interface ListOpportunitiesParams {
  limit?: number;
  page?: number;
  search?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

// `page` es el total de documentos que cumplen el filtro (no el numero de pagina)
export interface ListOpportunitiesData {
  opportunities: Opportunity[];
  page: number;
}

export function listOpportunities(
  params: ListOpportunitiesParams,
  signal?: AbortSignal,
): Promise<ApiResult<ListOpportunitiesData>> {
  return api.get<ListOpportunitiesData>('/list/opportunities', { query: { ...params }, signal });
}
