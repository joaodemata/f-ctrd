import { useEffect, useRef, useState } from 'react';
import { listMarketGainers, listMarketLosers } from '../api/biquote';
import type { ApiResult } from '../api/types';
import { useApiQuery } from '../hooks/useApiQuery';
import { PHONE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { MARKET_TYPES, type MarketMover, type MarketType } from '../models/biquote';
import { ErrorBanner } from './ErrorBanner';

// Ranking por variacion desde la apertura diaria; se refresca cada minuto
const MARKET_POLL_MS = 60_000;
const MOVERS_LIMIT = 10;
// Ultimo tipo de mercado elegido por el visitante; solo es una comodidad local
const TYPE_STORAGE_KEY = 'fctrd.marketType';

// '' es todos los mercados
function readMarketType(): MarketType | '' {
  try {
    const stored = localStorage.getItem(TYPE_STORAGE_KEY);
    return MARKET_TYPES.find((type) => type.value === stored)?.value ?? '';
  } catch {
    return '';
  }
}

function saveMarketType(type: MarketType | '') {
  try {
    localStorage.setItem(TYPE_STORAGE_KEY, type);
  } catch {
    // Sin almacenamiento (modo privado): vuelve a todos al recargar
  }
}

const TYPE_OPTIONS: readonly { value: MarketType | ''; label: string }[] = [{ value: '', label: 'Todos' }, ...MARKET_TYPES];

const percentFormat = new Intl.NumberFormat('es', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});
const priceFormat = new Intl.NumberFormat('es', { maximumSignificantDigits: 6 });
const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });
// Velocidad de la cinta en px por segundo
const TICKER_SPEED_PX_PER_S = 20;
// Desplazamiento de cada flecha y rapidez con la que se completa (fraccion del salto pendiente por segundo)
const TICKER_STEP_PX = 240;
const TICKER_NUDGE_RATE = 8;

// Forex es una cotizacion entre dos monedas (USDKRW 1.346) e Index son puntos: no llevan $. Acciones, cripto (pares
// en USDT) y materias primas cotizan en dolares
const NON_USD_TYPES = new Set(['Forex', 'Index']);

function formatMoverPrice(mover: MarketMover): string {
  const price = priceFormat.format(mover.lastPrice);
  return NON_USD_TYPES.has(mover.type) ? price : `$${price}`;
}

function MoverItems({ movers, hidden = false }: { movers: MarketMover[]; hidden?: boolean }) {
  return (
    <ul className="movers__list" aria-hidden={hidden || undefined}>
      {movers.map((mover) => (
        <li key={`${mover.exchange}:${mover.symbol}`} className="movers__item" title={`${mover.name} · ${mover.type}`}>
          <span className="movers__symbol">{mover.symbol}</span>
          <span className="movers__price">{formatMoverPrice(mover)}</span>
          <span className="movers__change">{percentFormat.format(mover.changePercent)}%</span>
        </li>
      ))}
    </ul>
  );
}

interface Movers {
  gainers: MarketMover[];
  losers: MarketMover[];
  marketState: string;
  asOf: string;
}

// Cinta en movimiento con flechas. La lista va dos veces y el desplazamiento se mantiene dentro de la mitad del
// ancho, asi el ciclo empalma sin salto. Se anima con requestAnimationFrame (no CSS) para sumar los saltos de las
// flechas al avance automatico. Se detiene con el mouse encima; con movimiento reducido solo se mueve con las flechas
function Ticker({ movers, direction }: { movers: MarketMover[]; direction: 1 | -1 }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const pendingNudge = useRef(0);
  const paused = useRef(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      // Tope de 100 ms: al volver a una pestana oculta no se adelanta de golpe
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      let delta = 0;
      if (!paused.current && !reducedMotion) delta += direction * TICKER_SPEED_PX_PER_S * dt;
      if (pendingNudge.current !== 0) {
        const step = reducedMotion ? pendingNudge.current : pendingNudge.current * Math.min(1, dt * TICKER_NUDGE_RATE);
        pendingNudge.current = Math.abs(pendingNudge.current - step) < 0.5 ? 0 : pendingNudge.current - step;
        delta += step;
      }

      const half = track.scrollWidth / 2;
      if (half > 0 && delta !== 0) {
        // Se mantiene en (-half, 0]
        offset.current = (((offset.current + delta) % half) - half) % half;
        track.style.transform = `translateX(${offset.current}px)`;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [direction]);

  // Flecha izquierda: muestra los anteriores (la cinta va a la derecha); derecha: los siguientes
  const nudge = (sign: 1 | -1) => {
    pendingNudge.current += sign * TICKER_STEP_PX;
  };

  return (
    <div className="movers__ticker-wrap">
      <button type="button" className="movers__arrow" onClick={() => nudge(1)} aria-label="Ver anteriores">
        ‹
      </button>
      <div
        className="movers__ticker"
        ref={viewportRef}
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => (paused.current = false)}
        onFocus={() => (paused.current = true)}
        onBlur={() => (paused.current = false)}
      >
        <div className="movers__track" ref={trackRef}>
          <MoverItems movers={movers} />
          <MoverItems movers={movers} hidden />
        </div>
      </div>
      <button type="button" className="movers__arrow" onClick={() => nudge(-1)} aria-label="Ver siguientes">
        ›
      </button>
    </div>
  );
}

function MoverRow({ label, tone, movers }: { label: string; tone: 'up' | 'down'; movers: MarketMover[] }) {
  return (
    <div className="movers__row" data-tone={tone}>
      <span className="movers__label">
        <span aria-hidden="true">{tone === 'up' ? '▲' : '▼'}</span> {label}
      </span>
      {movers.length === 0 ? (
        <span className="muted small">Sin datos</span>
      ) : (
        // Ganadores avanzan hacia la izquierda y perdedores hacia la derecha
        <Ticker movers={movers} direction={tone === 'up' ? -1 : 1} />
      )}
    </div>
  );
}

type Side = 'up' | 'down';

export function MarketMoversBanner() {
  const [marketType, setMarketType] = useState<MarketType | ''>(readMarketType);
  // En telefono se ve una sola cinta: ganadores o perdedores
  const isPhone = useMediaQuery(PHONE_QUERY);
  const [side, setSide] = useState<Side>('up');

  const selectType = (type: MarketType | '') => {
    setMarketType(type);
    saveMarketType(type);
  };

  const movers = useApiQuery(
    async (signal): Promise<ApiResult<Movers>> => {
      const query = { limit: MOVERS_LIMIT, type: marketType || undefined };
      const [gainers, losers] = await Promise.all([
        listMarketGainers(query, signal),
        listMarketLosers(query, signal),
      ]);
      if (!gainers.ok) return gainers;
      if (!losers.ok) return losers;
      return {
        ok: true,
        data: {
          gainers: gainers.data.data,
          losers: losers.data.data,
          marketState: losers.data.marketState,
          asOf: losers.data.asOf,
        },
        meta: losers.meta,
      };
    },
    [marketType],
    { pollIntervalMs: MARKET_POLL_MS },
  );

  const asOf = movers.data ? new Date(movers.data.asOf) : null;

  return (
    <section
      className="movers panel"
      aria-label="Ganadores y perdedores del mercado"
      aria-busy={movers.isLoading || movers.isRefreshing}
    >
      {/* Siempre visible, tambien con error, para poder cambiar de mercado. En telefono: selector de lado y de
          mercado en una sola linea */}
      {isPhone ? (
        <div className="movers__compact-bar">
          <div className="segmented" role="group" aria-label="Ganadores o perdedores">
            <button type="button" data-tone="up" aria-pressed={side === 'up'} onClick={() => setSide('up')}>
              ▲ Ganadores
            </button>
            <button type="button" data-tone="down" aria-pressed={side === 'down'} onClick={() => setSide('down')}>
              ▼ Perdedores
            </button>
          </div>
          <select
            className="movers__select"
            aria-label="Tipo de mercado"
            value={marketType}
            onChange={(event) => selectType(event.target.value as MarketType | '')}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="movers__filter" role="group" aria-label="Tipo de mercado">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value || 'all'}
              type="button"
              className="button button--small"
              aria-pressed={marketType === option.value}
              onClick={() => selectType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {movers.error && !movers.data ? (
        <ErrorBanner error={movers.error} onRetry={movers.refetch} />
      ) : movers.isLoading || !movers.data ? (
        <p className="muted small movers__loading">Cargando mercado…</p>
      ) : (
        <>
          {isPhone ? (
            <div className="movers__row movers__row--single" data-tone={side}>
              {(side === 'up' ? movers.data.gainers : movers.data.losers).length === 0 ? (
                <span className="muted small">Sin datos</span>
              ) : (
                <Ticker
                  key={side}
                  movers={side === 'up' ? movers.data.gainers : movers.data.losers}
                  direction={side === 'up' ? -1 : 1}
                />
              )}
            </div>
          ) : (
            <>
              <MoverRow label="Ganadores" tone="up" movers={movers.data.gainers} />
              <MoverRow label="Perdedores" tone="down" movers={movers.data.losers} />
            </>
          )}
          <p className="movers__meta muted small">
            {!isPhone && 'Variacion desde la apertura diaria · '}
            {isPhone ? 'Mercado' : 'mercado'} {movers.data.marketState === 'open' ? 'abierto' : 'cerrado'}
            {asOf && !Number.isNaN(asOf.getTime()) && ` · ${timeFormat.format(asOf)}`}
            {movers.error && ' · no se pudo actualizar'} · {!isPhone && 'Fuente: '}
            <a href="https://biquote.io/docs/#market" target="_blank" rel="noreferrer">
              biquote.io
            </a>
          </p>
        </>
      )}
    </section>
  );
}
