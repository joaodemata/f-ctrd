// Configuracion leida de las variables VITE_* (ver .env.example)

const DEFAULT_API_BASE_URL = 'http://localhost:8080';
const DEFAULT_POLL_INTERVAL_MS = 30_000;

// El servidor Go tiene 10s de read/write timeout, el frontend corta un poco antes
export const DEFAULT_TIMEOUT_MS = 9_000;

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

const parsedPoll = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? DEFAULT_POLL_INTERVAL_MS);
export const pollIntervalMs = Number.isFinite(parsedPoll) && parsedPoll >= 0 ? parsedPoll : DEFAULT_POLL_INTERVAL_MS;
