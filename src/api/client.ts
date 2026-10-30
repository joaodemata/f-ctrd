import { apiBaseUrl, DEFAULT_TIMEOUT_MS } from './config';
import { ApiError, FrontendTracking, apiErrorFromException, apiErrorFromResponse } from './errors';
import { clearSession, getSessionToken, isInvalidSessionTracking } from './session';
import type { ApiResponse, ApiResult, HttpMethod, QueryParams, QueryValue, RequestOptions } from './types';

// FormatValidateMiddleware acepta fechas en query como YYYY-MM-DD o RFC3339
function serializeQueryValue(value: QueryValue): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(apiBaseUrl + (path.startsWith('/') ? path : `/${path}`));
  if (query) {
    for (const [key, raw] of Object.entries(query)) {
      // Los slices de Go se envian como parametros repetidos
      const values = Array.isArray(raw) ? raw : [raw];
      for (const value of values) {
        const serialized = serializeQueryValue(value);
        if (serialized !== null) url.searchParams.append(key, serialized);
      }
    }
  }
  return url.toString();
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ApiResponse<unknown>>;
  return typeof candidate.status === 'string' && typeof candidate.tracking === 'string';
}

// Punto unico de salida hacia C-TRD. Ningun componente debe llamar fetch directamente
export async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  // Si el llamador cancela (por ejemplo un componente que se desmonta) cancelamos tambien
  const onExternalAbort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', onExternalAbort);

  try {
    const { body: requestBody } = options;
    // Un FormData se envia como multipart/form-data: el navegador arma el Content-Type con el boundary
    const isFormData = requestBody instanceof FormData;
    const isJson = requestBody !== undefined && !isFormData;
    // Con sesion iniciada el token va en todas las peticiones; las rutas publicas lo ignoran
    const token = getSessionToken();
    const response = await fetch(buildUrl(path, options.query), {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(isJson ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: isFormData ? requestBody : isJson ? JSON.stringify(requestBody) : undefined,
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch (cause) {
      return {
        ok: false,
        error: new ApiError({ kind: 'parse', tracking: FrontendTracking.parse, httpStatus: response.status, cause }),
      };
    }

    if (!isApiResponse(body)) {
      return {
        ok: false,
        error: new ApiError({ kind: 'parse', tracking: FrontendTracking.parse, httpStatus: response.status }),
      };
    }

    if (!response.ok || body.status !== 'SUCCESS') {
      // La sesion vencio o el usuario ya no esta disponible: se olvida el token (solo si es el mismo que se envio)
      if (token && token === getSessionToken() && isInvalidSessionTracking(body.tracking)) clearSession();
      return { ok: false, error: apiErrorFromResponse(response.status, body) };
    }

    return {
      ok: true,
      data: body.data as T,
      meta: { httpStatus: response.status, message: body.message, tracking: body.tracking, date: body.date },
    };
  } catch (cause) {
    return { ok: false, error: apiErrorFromException(cause, timedOut) };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }
}

type NoBodyOptions = Omit<RequestOptions, 'body'>;

export const api = {
  get: <T>(path: string, options?: NoBodyOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: NoBodyOptions) => request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: NoBodyOptions) => request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: NoBodyOptions) => request<T>('PATCH', path, { ...options, body }),
  delete: <T>(path: string, options?: NoBodyOptions) => request<T>('DELETE', path, options),
};
