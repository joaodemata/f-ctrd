import { api } from './client';
import type { ApiResult } from './types';
import type { CallbackInfo } from '../models/apiDefinition';

export interface ListCallbacksData {
  callbacks: CallbackInfo[];
}

// GET /list/callbacks?responseFormat=...: callbacks que saben leer el formato de respuesta de una API
export function listCallbacks(responseFormat: string, signal?: AbortSignal): Promise<ApiResult<ListCallbacksData>> {
  return api.get<ListCallbacksData>('/list/callbacks', { query: { responseFormat }, signal });
}
