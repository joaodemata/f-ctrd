import type { ApiResponse, FormatErrorData } from './types';

// Tipos de error que puede producir una llamada a la API
export type ApiErrorKind =
  | 'validation' // el backend rechazo el formato (tracking CC00x con data por campo)
  | 'api' // el backend respondio status FAIL
  | 'network' // no hubo respuesta (servidor caido, CORS bloqueado, sin red)
  | 'timeout' // se supero el tiempo de espera
  | 'aborted' // la peticion fue cancelada por el propio frontend
  | 'parse'; // la respuesta no es un APIResponse valido

// Tracking codes propios del frontend, mismo formato <capa><archivo>E<nnn> que C-TRD.
// F = frontend, API = capa, CL = client
export const FrontendTracking = {
  network: 'FAPICLE001',
  timeout: 'FAPICLE002',
  aborted: 'FAPICLE003',
  parse: 'FAPICLE004',
  unknown: 'FAPICLE005',
} as const;

const defaultMessages: Record<ApiErrorKind, string> = {
  validation: 'Los datos enviados no tienen el formato esperado.',
  api: 'El servidor no pudo completar la operacion.',
  network: 'No se pudo conectar con el servidor C-TRD.',
  timeout: 'El servidor tardo demasiado en responder.',
  aborted: 'La peticion fue cancelada.',
  parse: 'El servidor envio una respuesta inesperada.',
};

export interface ApiErrorInit {
  kind: ApiErrorKind;
  tracking: string;
  message?: string;
  httpStatus?: number | null;
  fieldErrors?: Record<string, string>;
  details?: string[];
  cause?: unknown;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly tracking: string;
  readonly httpStatus: number | null;
  // Mensajes por campo cuando kind es 'validation' (clave = nombre json del campo)
  readonly fieldErrors: Record<string, string>;
  readonly details: string[];
  readonly cause?: unknown;

  constructor(init: ApiErrorInit) {
    super(init.message || defaultMessages[init.kind]);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.tracking = init.tracking;
    this.httpStatus = init.httpStatus ?? null;
    this.fieldErrors = init.fieldErrors ?? {};
    this.details = init.details ?? [];
    this.cause = init.cause;
  }

  // Si vale la pena reintentar automaticamente
  get isRetryable(): boolean {
    return this.kind === 'network' || this.kind === 'timeout';
  }
}

function isFormatErrorData(data: unknown): data is FormatErrorData {
  if (typeof data !== 'object' || data === null) return false;
  const candidate = data as Partial<FormatErrorData>;
  return Array.isArray(candidate.details) && typeof candidate.error === 'string';
}

// Convierte una respuesta FAIL de C-TRD en un ApiError
export function apiErrorFromResponse(httpStatus: number, body: ApiResponse<unknown>): ApiError {
  if (isFormatErrorData(body.data)) {
    const fieldErrors: Record<string, string> = {};
    for (const [field, value] of Object.entries(body.data)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        fieldErrors[field] = value.details;
      }
    }
    return new ApiError({
      kind: 'validation',
      message: body.message,
      tracking: body.tracking,
      httpStatus,
      fieldErrors,
      details: body.data.details,
    });
  }

  return new ApiError({ kind: 'api', message: body.message, tracking: body.tracking, httpStatus });
}

// Convierte cualquier excepcion de fetch en un ApiError
export function apiErrorFromException(cause: unknown, timedOut: boolean): ApiError {
  if (timedOut) {
    return new ApiError({ kind: 'timeout', tracking: FrontendTracking.timeout, cause });
  }
  if (cause instanceof DOMException && cause.name === 'AbortError') {
    return new ApiError({ kind: 'aborted', tracking: FrontendTracking.aborted, cause });
  }
  // fetch lanza TypeError cuando no hay respuesta: servidor caido o CORS bloqueado
  if (cause instanceof TypeError) {
    return new ApiError({ kind: 'network', tracking: FrontendTracking.network, cause });
  }
  return new ApiError({
    kind: 'network',
    message: 'Error inesperado al llamar al servidor.',
    tracking: FrontendTracking.unknown,
    cause,
  });
}
