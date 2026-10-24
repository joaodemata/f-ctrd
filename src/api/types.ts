import type { ApiError } from './errors';

// Contrato de respuesta de C-TRD (common/response_handler.go -> APIResponse).
// Todas las rutas responden con esta envoltura, tanto en exito como en error.

export type ApiStatus = 'SUCCESS' | 'FAIL';

export interface ApiResponse<T> {
  status: ApiStatus;
  message: string;
  tracking: string;
  date: string;
  data?: T;
}

// Data de un error de formato (common/format_validator.go -> formatErrorData):
// cada campo invalido trae { details }, mas la lista "details" y el mensaje general "error".
export interface FormatErrorData {
  details: string[];
  error: string;
  [field: string]: { details: string } | string[] | string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue = string | number | boolean | Date | null | undefined;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;

export interface RequestOptions {
  query?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

// Datos de la envoltura de una respuesta exitosa
export interface ApiMeta {
  httpStatus: number;
  message: string;
  tracking: string;
  date: string;
}

// Resultado estandar de cualquier llamada: nunca lanza excepciones, igual que el
// ErrorHandler del backend nunca es nil. Se revisa siempre `ok` antes de usar `data`.
export type ApiResult<T> = { ok: true; data: T; meta: ApiMeta } | { ok: false; error: ApiError };
