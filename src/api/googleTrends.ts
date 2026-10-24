import { api } from './client';
import type { ApiResult } from './types';

// Limites del CSV (format_validates/operation_format_validate.go -> GoogleTrendsUploadFormatValidate)
export const GOOGLE_TRENDS_MAX_BYTES = 1 << 20;
export const GOOGLE_TRENDS_EXTENSION = '.csv';

export interface UploadGoogleTrendsData {
  idAsset: string;
  keyword: string;
  points: number;
  periodSeconds: number;
  lastDate: string;
  lastValue: number;
}

// POST /operation/google_trends/upload (multipart): reemplaza el CSV exportado de Google Trends del asset.
// /operation/google_trends/series es solo local y el navegador no puede usarla
export function uploadGoogleTrends(
  idAsset: string,
  file: File,
  signal?: AbortSignal,
): Promise<ApiResult<UploadGoogleTrendsData>> {
  const form = new FormData();
  form.append('idAsset', idAsset);
  form.append('file', file);
  return api.post<UploadGoogleTrendsData>('/operation/google_trends/upload', form, { signal });
}
