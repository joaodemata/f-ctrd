import { apiBaseUrl } from './config';

// Eventos del websocket de C-TRD (common/constants.go, typeEvent). Solo avisan que algo cambio, sin datos:
// cada cliente vuelve a consultar su listado con su propia sesion
export const ServerEventType = {
  OpportunitiesUpdated: 'OPPORTUNITIES-UPDATED',
} as const;

export type ServerEventType = (typeof ServerEventType)[keyof typeof ServerEventType];

// Mensaje del hub (common/web_socket.go -> Event)
export interface ServerEvent {
  typeEvent: string;
  data: unknown;
}

export type EventsConnectionStatus = 'connecting' | 'open' | 'closed';

type EventListener = (event: ServerEvent) => void;
// `reconnected` es true cuando se abre despues de una caida: pudieron perderse eventos
type StatusListener = (status: EventsConnectionStatus, reconnected: boolean) => void;

// Reintentos con espera exponencial, sin pasar de 30 s
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

export const eventsUrl = `${apiBaseUrl.replace(/^http/, 'ws')}/ws`;

const eventListeners = new Set<EventListener>();
const statusListeners = new Set<StatusListener>();

let socket: WebSocket | null = null;
let status: EventsConnectionStatus = 'closed';
let attempts = 0;
let hasOpened = false;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

function setStatus(next: EventsConnectionStatus, reconnected = false) {
  status = next;
  for (const listener of statusListeners) listener(next, reconnected);
}

function isServerEvent(value: unknown): value is ServerEvent {
  return typeof value === 'object' && value !== null && typeof (value as ServerEvent).typeEvent === 'string';
}

function connect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
  setStatus('connecting');

  let ws: WebSocket;
  try {
    ws = new WebSocket(eventsUrl);
  } catch {
    scheduleReconnect();
    return;
  }
  socket = ws;

  ws.onopen = () => {
    attempts = 0;
    const reconnected = hasOpened;
    hasOpened = true;
    setStatus('open', reconnected);
  };

  ws.onmessage = (message) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(message.data));
    } catch {
      return;
    }
    if (!isServerEvent(parsed)) return;
    for (const listener of eventListeners) listener(parsed);
  };

  ws.onclose = () => {
    if (socket !== ws) return;
    socket = null;
    setStatus('closed');
    scheduleReconnect();
  };
}

function scheduleReconnect() {
  // Sin suscriptores no se reconecta; la siguiente suscripcion abre de nuevo
  if (eventListeners.size === 0 && statusListeners.size === 0) return;
  const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempts);
  attempts += 1;
  reconnectTimer = setTimeout(connect, delay);
}

function disconnectIfUnused() {
  if (eventListeners.size > 0 || statusListeners.size > 0) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
  const ws = socket;
  socket = null;
  attempts = 0;
  hasOpened = false;
  status = 'closed';
  ws?.close();
}

// Suscribe a los eventos del hub. Todas las suscripciones comparten un solo websocket, que se abre con la primera
// y se cierra con la ultima. Retorna la funcion para desuscribirse
export function subscribeServerEvents(onEvent: EventListener, onStatus?: StatusListener): () => void {
  eventListeners.add(onEvent);
  if (onStatus) {
    statusListeners.add(onStatus);
    onStatus(status, false);
  }
  if (!socket && reconnectTimer === undefined) connect();

  return () => {
    eventListeners.delete(onEvent);
    if (onStatus) statusListeners.delete(onStatus);
    disconnectIfUnused();
  };
}
