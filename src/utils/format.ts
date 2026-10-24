// Formateadores de presentacion. Las fechas del backend llegan en UTC y se muestran en hora local

const dateTimeFormat = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });
const priceFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 8 });
const percentFormat = new Intl.NumberFormat('es', { style: 'percent', maximumFractionDigits: 1 });

// time.Time cero de Go, se trata como "sin fecha"
const GO_ZERO_TIME_PREFIX = '0001-01-01';

export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value || value.startsWith(GO_ZERO_TIME_PREFIX)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseApiDate(value);
  return date ? dateTimeFormat.format(date) : '—';
}

export function formatPrice(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : priceFormat.format(value);
}

export function formatProbability(value: number | undefined): string {
  if (value === undefined) return '';
  // El backend puede guardar 0.65 o 65; se normaliza a fraccion
  return percentFormat.format(value > 1 ? value / 100 : value);
}

// Tiempo restante hasta una fecha, en texto corto (ej: "3d 4h", "45m", "vencida")
export function formatTimeLeft(value: string | null | undefined, now: Date = new Date()): string {
  const date = parseApiDate(value);
  if (!date) return '—';
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return 'vencida';

  const minutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

// El search del backend se usa como regex de Mongo; se escapa para que el texto sea literal
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
