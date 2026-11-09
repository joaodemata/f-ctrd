import type { CalendarEvent, CalendarImportance, MarketMoversResponse } from '../models/biquote';
import { externalGet } from './client';
import { biquoteBaseUrl } from './config';
import type { ApiResult } from './types';

// Endpoints de la API publica de biquote. No pasan por C-TRD: no llevan sesion ni envoltura APIResponse

export interface CalendarQuery {
  importance?: CalendarImportance;
  from?: string; // ISO 8601, por defecto ayer
  to?: string; // ISO 8601, por defecto +7 dias
  countries?: string; // alfa-2 separados por coma
  limit?: number; // 1 a 500, por defecto 200
}

export function listCalendarEvents(query: CalendarQuery, signal?: AbortSignal): Promise<ApiResult<CalendarEvent[]>> {
  return externalGet<CalendarEvent[]>(biquoteBaseUrl, '/api/calendar', { query: { ...query }, signal });
}

export interface MarketMoversQuery {
  type?: string; // Stock | Crypto | Forex...
  limit?: number; // 1 a 100, por defecto 10
}

export function listMarketGainers(query: MarketMoversQuery, signal?: AbortSignal): Promise<ApiResult<MarketMoversResponse>> {
  return externalGet<MarketMoversResponse>(biquoteBaseUrl, '/api/market/gainers', { query: { ...query }, signal });
}

export function listMarketLosers(query: MarketMoversQuery, signal?: AbortSignal): Promise<ApiResult<MarketMoversResponse>> {
  return externalGet<MarketMoversResponse>(biquoteBaseUrl, '/api/market/losers', { query: { ...query }, signal });
}
