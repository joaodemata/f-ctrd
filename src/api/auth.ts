import { api } from './client';
import type { ApiResult } from './types';
import type { User } from '../models/user';

// Body de POST /auth/login (format_validates/auth_format_validate.go -> LoginFormat)
export interface LoginBody {
  username: string; // max 32, C-TRD lo pasa a minusculas
  password: string; // max 128
}

// El token solo se entrega aqui; va en Authorization: Bearer <token> (ver api/session.ts)
export interface LoginData {
  token: string;
  expiresAt: string;
  user: User;
}

export function login(body: LoginBody, signal?: AbortSignal): Promise<ApiResult<LoginData>> {
  return api.post<LoginData>('/auth/login', body, { signal });
}

// Cierra la sesion del token actual
export function logout(signal?: AbortSignal): Promise<ApiResult<null>> {
  return api.post<null>('/auth/logout', undefined, { signal });
}

// Usuario de la sesion del token actual
export function getMe(signal?: AbortSignal): Promise<ApiResult<User>> {
  return api.get<User>('/auth/me', { signal });
}
