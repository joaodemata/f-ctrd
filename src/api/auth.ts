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

// Body de POST /auth/create/user (CreateUserFormat). Solo el super usuario; idTypePrivilege no puede ser el del
// super usuario (DVAUT014). Username y email unicos (DVAUT004 / DVAUT005)
export interface CreateUserBody {
  username: string; // 3 a 32, minusculas y numeros
  password: string; // 8 a 128
  idTypePrivilege: string;
  email?: string; // minusculas, max 254
  name?: string; // max 100
  lastName?: string; // max 100
}

export interface CreateUserData {
  idUser: string;
}

export function createUser(body: CreateUserBody, signal?: AbortSignal): Promise<ApiResult<CreateUserData>> {
  return api.post<CreateUserData>('/auth/create/user', body, { signal });
}

// Body de PUT /auth/update/password (UpdatePasswordFormat): contraseña del super usuario de la sesion
export interface UpdatePasswordBody {
  currentPassword: string;
  newPassword: string; // 8 a 128, distinta de la actual
}

// C-TRD cierra todas las sesiones del usuario y abre una nueva: el token anterior deja de servir
export interface UpdatePasswordData {
  token: string;
  expiresAt: string;
}

export function updatePassword(body: UpdatePasswordBody, signal?: AbortSignal): Promise<ApiResult<UpdatePasswordData>> {
  return api.put<UpdatePasswordData>('/auth/update/password', body, { signal });
}

// Body de PUT /auth/update/user/password (ResetUserPasswordFormat): el super usuario asigna una contraseña nueva a
// otro usuario y C-TRD cierra todas sus sesiones. No hay endpoint para listar usuarios: se envia el id
export interface ResetUserPasswordBody {
  idUser: string;
  newPassword: string; // 8 a 128
}

export function resetUserPassword(body: ResetUserPasswordBody, signal?: AbortSignal): Promise<ApiResult<null>> {
  return api.put<null>('/auth/update/user/password', body, { signal });
}
