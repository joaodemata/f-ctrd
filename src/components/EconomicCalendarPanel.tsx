import { useEffect, useRef, useState } from 'react';
import { listCalendarEvents } from '../api/biquote';
import { useApiQuery, type QueryState } from '../hooks/useApiQuery';
import { NARROW_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { CALENDAR_TIME_MODE_EXACT, type CalendarEvent } from '../models/biquote';
import { translateEventName } from '../utils/calendarNames';
import { ErrorBanner } from './ErrorBanner';
import { currentLanguage, memoByLanguage, t } from '../i18n/language';

// El calendario cambia poco: se refresca cada 5 minutos (biquote permite 15.000 peticiones por minuto por IP)
const CALENDAR_POLL_MS = 5 * 60_000;
// Preferencia del visitante (panel abierto o cerrado); solo es una comodidad local
const OPEN_STORAGE_KEY = 'fctrd.calendarOpen';

const formats = memoByLanguage((locale) => ({
  time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
  day: new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short' }),
}));

const MULTIPLIER_SUFFIX: Partial<Record<string, string>> = { thousands: 'K', millions: 'M', billions: 'B' };

function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

function saveOpen(open: boolean) {
  try {
    localStorage.setItem(OPEN_STORAGE_KEY, String(open));
  } catch {
    // Sin almacenamiento (modo privado): el panel vuelve a abrirse al recargar
  }
}

// Los valores ya vienen en la escala del multiplicador (4.04 con millions = 4,04M)
function formatValue(value: number | null, event: CalendarEvent): string | null {
  if (value === null) return null;
  const number = new Intl.NumberFormat(currentLanguage(), {
    minimumFractionDigits: event.digits,
    maximumFractionDigits: event.digits,
  }).format(value);
  const suffix = MULTIPLIER_SUFFIX[event.multiplier] ?? '';
  return `${number}${suffix}${event.unit === 'percent' ? '%' : ''}`;
}

function filledValues(event: CalendarEvent): number {
  return [event.actual, event.forecast, event.previous].filter((value) => value !== null).length;
}

// biquote repite algunas publicaciones (mismo pais, nombre y hora) con ids distintos; se deja la que trae mas datos
function dedupe(events: CalendarEvent[]): CalendarEvent[] {
  const byKey = new Map<string, CalendarEvent>();
  for (const event of events) {
    const key = `${event.countryCode}|${event.name}|${event.time}`;
    const current = byKey.get(key);
    if (!current || filledValues(event) > filledValues(current)) byKey.set(key, event);
  }
  return [...byKey.values()];
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayLabel(date: Date, now: Date): string {
  const diffDays = Math.round((startOfLocalDay(date) - startOfLocalDay(now)) / 86_400_000);
  if (diffDays === 0) return t('Hoy', 'Today');
  if (diffDays === 1) return t('Mañana', 'Tomorrow');
  return formats().day.format(date);
}

interface DayGroup {
  label: string;
  events: CalendarEvent[];
}

// Desde el inicio de hoy (hora local) hasta el final de lo que devuelve biquote (+7 dias), agrupado por dia
function groupByDay(events: CalendarEvent[], now: Date): DayGroup[] {
  const todayStart = startOfLocalDay(now);
  const groups: DayGroup[] = [];
  for (const event of dedupe(events)) {
    const date = new Date(event.time);
    if (Number.isNaN(date.getTime()) || date.getTime() < todayStart) continue;
    const label = dayLabel(date, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.events.push(event);
    else groups.push({ label, events: [event] });
  }
  return groups;
}

// Hora local del evento; sin hora exacta puede salir en cualquier momento del dia
function eventTime(event: CalendarEvent): string {
  return event.timeMode === CALENDAR_TIME_MODE_EXACT
    ? formats().time.format(new Date(event.time))
    : t('Sin hora', 'No time');
}

// Ya paso: tiene dato real o su hora exacta quedo atras
function isPast(event: CalendarEvent, now: Date): boolean {
  if (event.actual !== null) return true;
  return event.timeMode === CALENDAR_TIME_MODE_EXACT && new Date(event.time).getTime() < now.getTime();
}

interface CalendarListProps {
  calendar: QueryState<CalendarEvent[]>;
  groups: DayGroup[];
  nextEvent: CalendarEvent | undefined;
  now: Date;
}

// Lista por dia; la usan el panel lateral y la hoja inferior de pantallas angostas
function CalendarList({ calendar, groups, nextEvent, now }: CalendarListProps) {
  return (
    <>
      {calendar.error && (
        <ErrorBanner error={calendar.error} onRetry={calendar.refetch} stale={!!calendar.data} />
      )}
      {calendar.isLoading && <p className="empty">{t('Cargando calendario…', 'Loading calendar…')}</p>}
      {calendar.data && groups.length === 0 && (
        <p className="empty">{t('Sin publicaciones de alto impacto.', 'No high-impact releases.')}</p>
      )}

      {groups.map((group) => (
        <section key={group.label} className="calendar__day">
          <h3 className="calendar__day-label">{group.label}</h3>
          <ul className="calendar__list">
            {group.events.map((event) => {
              const actual = formatValue(event.actual, event);
              const forecast = formatValue(event.forecast, event);
              const previous = formatValue(event.previous, event);
              return (
                <li
                  key={event.id}
                  className="calendar__event"
                  data-past={isPast(event, now)}
                  data-next={event === nextEvent}
                >
                  <span className="calendar__time">{eventTime(event)}</span>
                  <span className="calendar__country" title={event.currency}>
                    {event.countryCode}
                  </span>
                  {/* El nombre original en ingles queda como tooltip */}
                  <span className="calendar__name" title={event.name}>
                    {event.sourceUrl ? (
                      <a href={event.sourceUrl} target="_blank" rel="noreferrer">
                        {translateEventName(event.name)}
                      </a>
                    ) : (
                      translateEventName(event.name)
                    )}
                  </span>
                  {(actual || forecast || previous) && (
                    <span className="calendar__values small">
                      {actual && (
                        <span>
                          {t('Real', 'Actual')} <strong>{actual}</strong>
                        </span>
                      )}
                      {forecast && (
                        <span>
                          {t('Prev.', 'Fcst.')} {forecast}
                        </span>
                      )}
                      {previous && (
                        <span>
                          {t('Ant.', 'Prev.')} {previous}
                        </span>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="calendar__source muted small">
        {t('Hora local. Fuente:', 'Local time. Source:')}{' '}
        <a href="https://biquote.io/docs/#calendar" target="_blank" rel="noreferrer">
          biquote.io
        </a>
      </p>
    </>
  );
}

export function EconomicCalendarPanel() {
  const [open, setOpen] = useState(readOpen);
  // Reloj de la vista: marca los eventos pasados y el siguiente sin esperar al refresco
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const calendar = useApiQuery((signal) => listCalendarEvents({ importance: 'high' }, signal), [], {
    pollIntervalMs: CALENDAR_POLL_MS,
  });

  const toggle = () => {
    setOpen((value) => {
      saveOpen(!value);
      return !value;
    });
  };

  const groups = calendar.data ? groupByDay(calendar.data, now) : [];
  const nextEvent = groups.flatMap((group) => group.events).find((event) => !isPast(event, now));

  // Pantalla angosta: una barra de una linea con el proximo evento que abre la lista en una hoja inferior (dialog
  // modal: Escape, foco y fondo los maneja el navegador)
  const isNarrow = useMediaQuery(NARROW_QUERY);
  const sheetRef = useRef<HTMLDialogElement>(null);

  if (isNarrow) {
    return (
      <>
        <button type="button" className="calendar-bar panel" onClick={() => sheetRef.current?.showModal()}>
          <span className="calendar-bar__title">{t('Calendario', 'Calendar')}</span>
          <span className="calendar-bar__next">
            {nextEvent
              ? `${eventTime(nextEvent)} ${nextEvent.countryCode} ${translateEventName(nextEvent.name)}`
              : calendar.isLoading
                ? t('Cargando…', 'Loading…')
                : t('Ver publicaciones de alto impacto', 'See high-impact releases')}
          </span>
          <span className="calendar-bar__chevron" aria-hidden="true">
            ›
          </span>
        </button>

        <dialog
          ref={sheetRef}
          className="sheet"
          aria-label={t('Calendario economico de alto impacto', 'High-impact economic calendar')}
          // Clic en el fondo (fuera de la hoja) la cierra
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}
        >
          <div className="sheet__head">
            <strong>{t('Calendario economico', 'Economic calendar')}</strong>
            <span className="muted small">{t('alto impacto', 'high impact')}</span>
            <button
              type="button"
              className="sheet__close"
              aria-label={t('Cerrar', 'Close')}
              onClick={() => sheetRef.current?.close()}
            >
              ×
            </button>
          </div>
          <div className="calendar__body sheet__body">
            <CalendarList calendar={calendar} groups={groups} nextEvent={nextEvent} now={now} />
          </div>
        </dialog>
      </>
    );
  }

  return (
    <aside className="calendar panel" data-open={open} aria-busy={calendar.isLoading || calendar.isRefreshing}>
      <button type="button" className="calendar__toggle" onClick={toggle} aria-expanded={open} aria-controls="calendar-body">
        <span>
          <strong>{t('Calendario economico', 'Economic calendar')}</strong>
          <span className="muted small"> · {t('alto impacto', 'high impact')}</span>
        </span>
        <span className="calendar__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {!open && nextEvent && (
        <p className="calendar__next muted small">
          {t('Proximo:', 'Next:')} {eventTime(nextEvent)} {nextEvent.countryCode} {translateEventName(nextEvent.name)}
        </p>
      )}

      {open && (
        <div className="calendar__body" id="calendar-body">
          <CalendarList calendar={calendar} groups={groups} nextEvent={nextEvent} now={now} />
        </div>
      )}
    </aside>
  );
}
