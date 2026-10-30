// Token de la sesion de C-TRD. Se guarda en localStorage para sobrevivir a recargas; C-TRD solo guarda su SHA-256
// y la sesion vence a las 12 horas (common/constants.go -> SessionTTL)

const STORAGE_KEY = 'fctrd.session';

// Trackings de C-TRD que indican que el token enviado ya no sirve: sesion vencida o anterior a guardar el usuario
// (AuthDataValidate DVAUT002/021, OptionalAuthDataValidate DVAUT024/025) o usuario no disponible (DVAUT003, CAUTE001)
const INVALID_SESSION_TRACKINGS: ReadonlySet<string> = new Set([
  'DVAUT002',
  'DVAUT003',
  'DVAUT021',
  'DVAUT024',
  'DVAUT025',
  'CAUTE001',
]);

interface StoredSession {
  token: string;
  expiresAt: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function readStored(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed.token !== 'string' || typeof parsed.expiresAt !== 'string') return null;
    return { token: parsed.token, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

let current: StoredSession | null = readStored();

function isExpired(session: StoredSession): boolean {
  const expiresAt = Date.parse(session.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

// Token vigente o null. Un token vencido se descarta sin esperar a que C-TRD lo rechace
export function getSessionToken(): string | null {
  if (current && isExpired(current)) clearSession();
  return current?.token ?? null;
}

export function saveSession(token: string, expiresAt: string): void {
  current = { token, expiresAt };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Sin almacenamiento la sesion dura hasta recargar la pagina
  }
  listeners.forEach((listener) => listener());
}

export function clearSession(): void {
  if (current === null) return;
  current = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada que limpiar
  }
  listeners.forEach((listener) => listener());
}

// Avisa cuando se inicia o se cierra la sesion (tambien cuando C-TRD rechaza el token)
export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isInvalidSessionTracking(tracking: string): boolean {
  return INVALID_SESSION_TRACKINGS.has(tracking);
}
