import { useEffect, useRef } from 'react';

// Fondo animado: velas japonesas con su media movil avanzando despacio, en baja opacidad para no competir con el
// contenido. Los datos son aleatorios (decorativos). Se pausa con la pestaña oculta y queda quieto con reduced motion
const CANDLE_STEP = 16; // ancho de cada vela con su separacion (px)
const SPEED = 8; // px por segundo
const MA_PERIOD = 10;
const GRID_EVERY = 8; // una linea vertical cada N velas
const BASE_PRICE = 100;

interface Candle {
  open: number;
  close: number;
  high: number;
  low: number;
}

interface Colors {
  up: string;
  down: string;
  line: string;
  grid: string;
}

function readColors(): Colors {
  const style = getComputedStyle(document.documentElement);
  const value = (name: string) => style.getPropertyValue(name).trim();
  return { up: value('--status-active'), down: value('--status-canceled'), line: value('--accent'), grid: value('--border') };
}

// Paseo aleatorio con leve sesgo alcista y vuelta a la media, asi el precio no se escapa del rango
function nextCandle(previousClose: number): Candle {
  const open = previousClose;
  const close = open + (Math.random() - 0.47) * 3 + (BASE_PRICE - open) * 0.03;
  return {
    open,
    close,
    high: Math.max(open, close) + Math.random() * 1.4,
    low: Math.min(open, close) - Math.random() * 1.4,
  };
}

export function MarketBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    let colors = readColors();
    let width = 0;
    let height = 0;
    let candles: Candle[] = [];
    let firstIndex = 0; // indice absoluto de candles[0], mantiene fija la grilla vertical al desplazar
    let offset = 0;
    let scaleMin = 0;
    let scaleMax = 0;
    let frame = 0;
    let lastTime = 0;

    const fill = () => {
      const needed = Math.ceil(width / CANDLE_STEP) + MA_PERIOD + 2;
      while (candles.length < needed) {
        candles.push(nextCandle(candles[candles.length - 1]?.close ?? BASE_PRICE));
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const visible = candles.slice(MA_PERIOD);
      if (visible.length === 0) return;

      // Escala suavizada para que la entrada de una vela no haga saltar el grafico
      const targetMin = Math.min(...visible.map((candle) => candle.low));
      const targetMax = Math.max(...visible.map((candle) => candle.high));
      if (scaleMax === scaleMin) {
        scaleMin = targetMin;
        scaleMax = targetMax;
      } else {
        scaleMin += (targetMin - scaleMin) * 0.05;
        scaleMax += (targetMax - scaleMax) * 0.05;
      }
      const top = height * 0.3;
      const bottom = height * 0.92;
      const range = scaleMax - scaleMin || 1;
      const y = (price: number) => bottom - ((price - scaleMin) / range) * (bottom - top);
      const x = (index: number) => (index - MA_PERIOD) * CANDLE_STEP - offset + CANDLE_STEP / 2;

      // Grilla
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let row = 0; row <= 5; row++) {
        const lineY = Math.round(top + ((bottom - top) * row) / 5) + 0.5;
        ctx.moveTo(0, lineY);
        ctx.lineTo(width, lineY);
      }
      candles.forEach((_, index) => {
        if ((firstIndex + index) % GRID_EVERY !== 0) return;
        const lineX = Math.round(x(index)) + 0.5;
        ctx.moveTo(lineX, top);
        ctx.lineTo(lineX, bottom);
      });
      ctx.stroke();

      // Velas
      ctx.globalAlpha = 0.28;
      const bodyWidth = CANDLE_STEP * 0.55;
      candles.forEach((candle, index) => {
        const centerX = x(index);
        if (centerX < -CANDLE_STEP || centerX > width + CANDLE_STEP) return;
        const color = candle.close >= candle.open ? colors.up : colors.down;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(Math.round(centerX) + 0.5, y(candle.high));
        ctx.lineTo(Math.round(centerX) + 0.5, y(candle.low));
        ctx.stroke();
        const bodyTop = y(Math.max(candle.open, candle.close));
        ctx.fillRect(centerX - bodyWidth / 2, bodyTop, bodyWidth, Math.max(1, y(Math.min(candle.open, candle.close)) - bodyTop));
      });

      // Media movil con area degradada debajo
      const points: Array<[number, number]> = [];
      for (let index = MA_PERIOD; index < candles.length; index++) {
        const period = candles.slice(index - MA_PERIOD + 1, index + 1);
        const average = period.reduce((sum, candle) => sum + candle.close, 0) / period.length;
        points.push([x(index), y(average)]);
      }
      const first = points[0];
      const last = points[points.length - 1];
      if (!first || !last) return;

      ctx.beginPath();
      points.forEach(([pointX, pointY], index) => (index === 0 ? ctx.moveTo(pointX, pointY) : ctx.lineTo(pointX, pointY)));
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      ctx.lineTo(last[0], bottom);
      ctx.lineTo(first[0], bottom);
      ctx.closePath();
      const area = ctx.createLinearGradient(0, top, 0, bottom);
      area.addColorStop(0, colors.line);
      area.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = area;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      fill();
      draw();
    };

    const tick = (time: number) => {
      const elapsed = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      offset += SPEED * elapsed;
      while (offset >= CANDLE_STEP) {
        offset -= CANDLE_STEP;
        candles = candles.slice(1);
        firstIndex++;
        fill();
      }
      draw();
      frame = requestAnimationFrame(tick);
    };

    const stop = () => cancelAnimationFrame(frame);
    const start = () => {
      stop();
      if (document.hidden || reducedMotion.matches) return;
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const updateColors = () => {
      colors = readColors();
      draw();
    };

    resize();
    start();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', start);
    reducedMotion.addEventListener('change', start);
    darkScheme.addEventListener('change', updateColors);
    return () => {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', start);
      reducedMotion.removeEventListener('change', start);
      darkScheme.removeEventListener('change', updateColors);
    };
  }, []);

  return (
    <div className="backdrop" aria-hidden="true">
      <canvas ref={canvasRef} className="backdrop__chart" />
    </div>
  );
}
