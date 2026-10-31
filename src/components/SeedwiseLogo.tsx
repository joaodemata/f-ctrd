// Logo de seedwise.io: un brote que crece desde la tierra y da como fruto una moneda con el signo $.
// Con animated la planta se dibuja (tallo, hojas, moneda y $ en ese orden); sin animated queda en su estado final.
// Los colores son las variables --brand-* de styles.css, con su override de modo oscuro
interface SeedwiseLogoProps {
  animated?: boolean;
  className?: string;
  // Texto accesible; sin el, el logo es decorativo
  title?: string;
}

export function SeedwiseLogo({ animated = false, className, title }: SeedwiseLogoProps) {
  const classes = ['seedwise-logo', animated ? 'seedwise-logo--animated' : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      className={classes}
      viewBox="0 0 48 48"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path className="seedwise-logo__soil" d="M11 42.5 Q24 37.5 37 42.5" />
      <g className="seedwise-logo__plant">
        <path className="seedwise-logo__stem" pathLength={1} d="M24 41 C24 34 22.6 27 24 19" />
        <path
          className="seedwise-logo__leaf seedwise-logo__leaf--left"
          d="M23.6 35 C17.5 35.2 13.4 32.4 12 27.6 C17.6 26.6 21.8 29.6 23.6 35 Z"
        />
        <path
          className="seedwise-logo__leaf seedwise-logo__leaf--right"
          d="M23.9 29 C29.6 29 33.8 26.4 35.4 21.6 C29.8 20.4 25.6 23.4 23.9 29 Z"
        />
        <g className="seedwise-logo__fruit">
          <circle className="seedwise-logo__coin" cx="24" cy="12" r="7.4" />
          <path
            className="seedwise-logo__dollar"
            pathLength={1}
            d="M26.9 9.3 C26.3 8.5 25.3 8.1 24 8.1 C22.4 8.1 21.2 8.9 21.2 10.2 C21.2 11.6 22.5 12 24 12.3 C25.6 12.6 26.9 13.1 26.9 14.5 C26.9 15.8 25.6 16.5 24 16.5 C22.6 16.5 21.6 16 20.9 15.1 M24 6.5 V17.5"
          />
        </g>
      </g>
    </svg>
  );
}
