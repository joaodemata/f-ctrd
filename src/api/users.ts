import { api } from './client';
import type { ApiResult } from './types';
import type { User } from '../models/user';

// Query de GET /list/users (cmm.PaginationFormat + ListUsersFormat). Solo el super usuario
export interface ListUsersParams {
  limit?: number; // 1 a 100
  page?: number;
  search?: string; // literal, C-TRD lo escapa (username, email, nombre y apellido)
  tagPrivilege?: string; // SUPER_USER | GENERIC_USER | AGENT, vacio lista todos
}

// Usuarios no borrados, los mas recientes primero. `page` es el total de documentos que cumplen el filtro
export interface ListUsersData {
  users: User[];
  page: number;
}

export function listUsers(params: ListUsersParams, signal?: AbortSignal): Promise<ApiResult<ListUsersData>> {
  return api.get<ListUsersData>('/list/users', { query: { ...params }, signal });
}
