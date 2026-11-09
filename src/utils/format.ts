// Formateadores de presentacion. Las fechas del backend llegan en UTC y se muestran en hora local

import { memoByLanguage, t } from '../i18n/language';

// Formateadores por idioma (la app se vuelve a montar al cambiarlo)
const format = memoByLanguage((locale) => ({
  dateTime: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
  // Fechas sin hora (ej: periodos de Google Trends): se guardan a medianoche UTC y se muestran en UTC para no correr el dia
  date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }),
  price: new Intl.NumberFormat(locale, { maximumFractionDigits: 8 }),
  percent: new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }),
}));

// time.Time cero de Go, se trata como "sin fecha"
const GO_ZERO_TIME_PREFIX = '0001-01-01';

export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value || value.startsWith(GO_ZERO_TIME_PREFIX)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseApiDate(value);
  return date ? format().dateTime.format(date) : '—';
}

export function formatDate(value: string | null | undefined): string {
  const date = parseApiDate(value);
  return date ? format().date.format(date) : '—';
}

export function formatPrice(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `$${format().price.format(value)}`;
}

export function formatProbability(value: number | undefined): string {
  if (value === undefined) return '';
  // El backend puede guardar 0.65 o 65; se normaliza a fraccion
  return format().percent.format(value > 1 ? value / 100 : value);
}

// Tiempo restante hasta una fecha, en texto corto (ej: "3d 4h", "45m", "vencida" / "expired")
export function formatTimeLeft(value: string | null | undefined, now: Date = new Date()): string {
  const date = parseApiDate(value);
  if (!date) return '—';
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return t('vencida', 'expired');
  return formatDuration(Math.floor(diffMs / 60_000));
}

// Duracion en minutos como texto corto (ej: "3d 4h", "2h 30m", "45m")
export function formatDuration(totalMinutes: number): string {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

// El search del backend se usa como regex de Mongo; se escapa para que el texto sea literal
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
