import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getMe, login as loginRequest, logout as logoutRequest, type LoginBody } from '../api/auth';
import type { ApiError } from '../api/errors';
import { clearSession, getSessionToken, saveSession, subscribeSession } from '../api/session';
import type { ApiResult } from '../api/types';
import { isSuperUser, type User } from '../models/user';

// checking: hay un token guardado y se esta consultando /auth/me
export type AuthStatus = 'checking' | 'anonymous' | 'authenticated';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  isSuperUser: boolean;
  // Error de la ultima validacion del token guardado (por ejemplo C-TRD caido)
  error: ApiError | undefined;
  login: (body: LoginBody, signal?: AbortSignal) => Promise<ApiResult<User>>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// La sesion es opcional: sin ella se usan las rutas publicas y las del super usuario se ocultan
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (getSessionToken() ? 'checking' : 'anonymous'));
  const [error, setError] = useState<ApiError>();

  // Valida el token guardado al cargar la pagina
  useEffect(() => {
    if (!getSessionToken()) return;
    const controller = new AbortController();
    void getMe(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (result.ok) {
        setUser(result.data);
        setStatus('authenticated');
        return;
      }
      // Un token rechazado ya lo borro client.ts; con otro error se conserva para el proximo intento
      if (result.error.kind !== 'aborted') setError(result.error);
      setUser(null);
      setStatus('anonymous');
    });
    return () => controller.abort();
  }, []);

  // Si C-TRD rechaza el token en cualquier peticion la sesion se cierra aqui tambien
  useEffect(
    () =>
      subscribeSession(() => {
        if (getSessionToken()) return;
        setUser(null);
        setStatus('anonymous');
      }),
    [],
  );

  const login = useCallback(async (body: LoginBody, signal?: AbortSignal): Promise<ApiResult<User>> => {
    const result = await loginRequest(body, signal);
    if (!result.ok) return result;
    saveSession(result.data.token, result.data.expiresAt);
    setUser(result.data.user);
    setStatus('authenticated');
    setError(undefined);
    return { ok: true, data: result.data.user, meta: result.meta };
  }, []);

  // El token se olvida aunque C-TRD no responda; la sesion del servidor vence sola
  const logout = useCallback(async () => {
    if (getSessionToken()) await logoutRequest();
    clearSession();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AuthState>(
    () => ({ status, user, isSuperUser: isSuperUser(user), error, login, logout }),
    [status, user, error, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth se usa dentro de AuthProvider');
  return auth;
}
