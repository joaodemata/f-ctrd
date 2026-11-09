// Modelos de la API publica de biquote (https://biquote.io/docs). No son de C-TRD: se copian de las respuestas reales,
// que difieren de la documentacion en el mercado (`data` y `name` en lugar de `items` y `description`)

// GET /api/calendar: evento del calendario economico. La API devuelve un arreglo del mas antiguo al mas reciente
export interface CalendarEvent {
  id: string;
  eventId: string;
  time: string; // UTC, RFC3339
  period: string | null;
  countryCode: string; // alfa-2 (EU para la zona euro)
  currency: string;
  name: string;
  importance: CalendarImportance;
  type: string; // event | indicator | holiday
  sector: string;
  unit: string; // none | percent | barrel...
  multiplier: string; // none | thousands | millions | billions
  digits: number;
  // null es "aun no publicado", no cero
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  revisedPrevious: number | null;
  revision: number;
  // Distinto de exact: la hora es un marcador y el evento puede salir en cualquier momento del dia
  timeMode: string;
  sourceUrl: string;
  source: string;
}

export type CalendarImportance = 'low' | 'medium' | 'high';

export const CALENDAR_TIME_MODE_EXACT = 'exact';

// Valores del parametro `type` de /api/market/* (el valor que devuelve cada simbolo en `type`), con su nombre en espanol
export const MARKET_TYPES = [
  { value: 'Crypto', label: 'Cripto' },
  { value: 'Stock', label: 'Acciones' },
  { value: 'Forex', label: 'Forex' },
  { value: 'Commodity', label: 'Materias primas' },
  { value: 'Index', label: 'Índices' },
] as const;

export type MarketType = (typeof MARKET_TYPES)[number]['value'];

// GET /api/market/gainers y /api/market/losers
export interface MarketMover {
  symbol: string;
  name: string;
  exchange: string;
  type: string; // Stock | Crypto | Forex...
  lastPrice: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
}

export interface MarketMoversResponse {
  period: string;
  exchange: string | null;
  type: string | null;
  data: MarketMover[];
  marketState: string;
  asOf: string;
}
