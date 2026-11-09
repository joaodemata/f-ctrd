import { t, type Localized } from '../i18n/language';
import type { ApiResponse, FormatErrorData } from './types';

// Tipos de error que puede producir una llamada a la API
export type ApiErrorKind =
  | 'validation' // el backend rechazo el formato (tracking CC00x con data por campo)
  | 'api' // el backend respondio status FAIL
  | 'rateLimit' // el backend rechazo la peticion por exceso de peticiones (429, CMMRLE001)
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
  // Una API externa (biquote) respondio un error HTTP
  external: 'FAPICLE006',
  // Una API externa rechazo la peticion por exceso de peticiones (429)
  externalRateLimit: 'FAPICLE007',
} as const;

// Mensajes propios del frontend; los de C-TRD llegan en espanol y se muestran tal cual
const defaultMessages: Record<ApiErrorKind, Localized> = {
  validation: { es: 'Los datos enviados no tienen el formato esperado.', en: 'The data sent does not have the expected format.' },
  api: { es: 'El servidor no pudo completar la operacion.', en: 'The server could not complete the operation.' },
  rateLimit: { es: 'Demasiadas peticiones, intenta mas tarde.', en: 'Too many requests, try again later.' },
  network: { es: 'No se pudo conectar con el servidor C-TRD.', en: 'Could not connect to the C-TRD server.' },
  timeout: { es: 'El servidor tardo demasiado en responder.', en: 'The server took too long to respond.' },
  aborted: { es: 'La peticion fue cancelada.', en: 'The request was canceled.' },
  parse: { es: 'El servidor envio una respuesta inesperada.', en: 'The server sent an unexpected response.' },
};

export interface ApiErrorInit {
  kind: ApiErrorKind;
  tracking: string;
  message?: string;
  httpStatus?: number | null;
  fieldErrors?: Record<string, string>;
  details?: string[];
  retryAfterSeconds?: number | null;
  cause?: unknown;
}

// Rate limit de C-TRD (common/rate_limit.go): 429 con data.retryAfterSeconds
export const RATE_LIMIT_TRACKING = 'CMMRLE001';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly tracking: string;
  readonly httpStatus: number | null;
  // Mensajes por campo cuando kind es 'validation' (clave = nombre json del campo)
  readonly fieldErrors: Record<string, string>;
  readonly details: string[];
  // Segundos que pide esperar C-TRD cuando kind es 'rateLimit'
  readonly retryAfterSeconds: number | null;
  readonly cause?: unknown;

  constructor(init: ApiErrorInit) {
    super(init.message || t(defaultMessages[init.kind]));
    this.name = 'ApiError';
    this.kind = init.kind;
    this.tracking = init.tracking;
    this.httpStatus = init.httpStatus ?? null;
    this.fieldErrors = init.fieldErrors ?? {};
    this.details = init.details ?? [];
    this.retryAfterSeconds = init.retryAfterSeconds ?? null;
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

function readRetryAfterSeconds(data: unknown): number | null {
  if (typeof data !== 'object' || data === null) return null;
  const value = (data as { retryAfterSeconds?: unknown }).retryAfterSeconds;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

// Convierte una respuesta FAIL de C-TRD en un ApiError
export function apiErrorFromResponse(httpStatus: number, body: ApiResponse<unknown>): ApiError {
  if (httpStatus === 429 || body.tracking === RATE_LIMIT_TRACKING) {
    return new ApiError({
      kind: 'rateLimit',
      message: body.message,
      tracking: body.tracking,
      httpStatus,
      retryAfterSeconds: readRetryAfterSeconds(body.data),
    });
  }

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

// Convierte una respuesta de error de una API externa. biquote responde { error } y en 429 el header Retry-After
export function apiErrorFromExternalResponse(response: Response, body: unknown): ApiError {
  const message =
    typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : undefined;

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After'));
    return new ApiError({
      kind: 'rateLimit',
      message,
      tracking: FrontendTracking.externalRateLimit,
      httpStatus: 429,
      retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    });
  }

  return new ApiError({ kind: 'api', message, tracking: FrontendTracking.external, httpStatus: response.status });
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
    message: t('Error inesperado al llamar al servidor.', 'Unexpected error calling the server.'),
    tracking: FrontendTracking.unknown,
    cause,
  });
}
