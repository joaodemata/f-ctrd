import type { ReactNode } from 'react';
import { listApis } from '../api/apis';
import { listCallbacks } from '../api/callbacks';
import { listCatalogs } from '../api/catalogs';
import type { ApiResult } from '../api/types';
import { useApiQuery } from '../hooks/useApiQuery';
import { t, type Localized } from '../i18n/language';
import type { ApiDefinition, CallbackInfo } from '../models/apiDefinition';
import { CatalogType } from '../models/catalog';
import { OpportunityStatusTag } from '../models/opportunity';
import { parameterRangeText } from './ApiParameterInput';
import { ErrorBanner } from './ErrorBanner';

// Piezas de la ayuda comunes a los dos idiomas (HelpContentEs.tsx y HelpContentEn.tsx): indice, secciones, catalogos
// reales de C-TRD y el diagrama de estados

// Los ids no cambian con el idioma: son las anclas de las secciones en los dos cuerpos
export const SECTIONS: readonly { id: string; label: Localized }[] = [
  { id: 'ayuda-resumen', label: { es: 'Como encaja todo', en: 'How it fits together' } },
  { id: 'ayuda-ciclo', label: { es: 'Ciclo de vida', en: 'Life cycle' } },
  { id: 'ayuda-triggers', label: { es: 'Triggers y alertas', en: 'Triggers and alerts' } },
  { id: 'ayuda-tradingview', label: { es: 'TradingView', en: 'TradingView' } },
  { id: 'ayuda-origenes', label: { es: 'n8n y otros origenes', en: 'n8n and other sources' } },
  { id: 'ayuda-visibilidad', label: { es: 'Usuarios y visibilidad', en: 'Users and visibility' } },
  { id: 'ayuda-cancelar', label: { es: 'Cancelar', en: 'Cancel' } },
  { id: 'ayuda-condiciones', label: { es: 'Condiciones', en: 'Conditions' } },
  { id: 'ayuda-callbacks', label: { es: 'Callbacks', en: 'Callbacks' } },
  { id: 'ayuda-senales', label: { es: 'Senales complejas', en: 'Complex signals' } },
  { id: 'ayuda-recetas', label: { es: 'Ejemplos', en: 'Examples' } },
  { id: 'ayuda-recorrido', label: { es: 'Caso completo', en: 'Full walkthrough' } },
  { id: 'ayuda-agentes', label: { es: 'Agentes de IA', en: 'AI agents' } },
  { id: 'ayuda-problemas', label: { es: 'Problemas frecuentes', en: 'Common problems' } },
  { id: 'ayuda-enlaces', label: { es: 'Enlaces y glosario', en: 'Links and glossary' } },
];

// El hash ya lo usa la navegacion (#/ayuda), asi que el indice hace scroll en lugar de usar anclas
export function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="panel panel--padded help-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      {children}
    </section>
  );
}

export const hookBodyExample = () => `{
  "idWebhook": "${t('<id del webhook del trigger>', '<webhook id of the trigger>')}",
  "price": {{close}},
  "metadatos": { "ticker": "{{ticker}}", "interval": "{{interval}}" },
  "stopLoss": [{ "price": 65000, "probability": 0.3 }],
  "takeProfit": [{ "price": 72000, "probability": 0.5 }]
}`;

export const cancelBodyExample = () => `{
  "idWebhook": "${t('<id del webhook del trigger>', '<webhook id of the trigger>')}",
  "price": {{close}},
  "idCancel": "${t('<id de la razon de cancelacion>', '<id of the cancel reason>')}"
}`;

// Enlace a otra seccion de la ayuda (el hash lo usa la navegacion, asi que hace scroll)
export function SectionLink({ id, children }: { id: string; children: ReactNode }) {
  return (
    <a
      href="#/ayuda"
      onClick={(event) => {
        event.preventDefault();
        scrollToSection(id);
      }}
    >
      {children}
    </a>
  );
}

interface RecipeProps {
  title: string;
  source?: string;
  trigger: string;
  conditions: string[];
  idea: string;
}

export function Recipe({ title, source = 'TradingView', trigger, conditions, idea }: RecipeProps) {
  return (
    <div className="help-card">
      <h3>{title}</h3>
      <p className="muted small">
        {t('Origen:', 'Source:')} {source}
      </p>
      <p>
        <strong>Trigger:</strong> {trigger}
      </p>
      {conditions.length === 0 ? (
        <p>
          <strong>{t('Condiciones:', 'Conditions:')}</strong> {t('ninguna, nace Activa.', 'none, it is born Active.')}
        </p>
      ) : (
        <>
          <p>
            <strong>{t('Condiciones (todas):', 'Conditions (all):')}</strong>
          </p>
          <ul className="help-list">
            {conditions.map((condition) => (
              <li key={condition}>{condition}</li>
            ))}
          </ul>
        </>
      )}
      <p className="muted small">{idea}</p>
    </div>
  );
}

interface CallbackGroup {
  api: ApiDefinition;
  callbacks: CallbackInfo[];
}

// Catalogo real: las APIs activas y los callbacks compatibles con su formato de respuesta
export function CallbackCatalog() {
  const catalog = useApiQuery(async (signal): Promise<ApiResult<CallbackGroup[]>> => {
    // C-TRD limita el listado de APIs a 100 por pagina; hoy hay pocas
    const apis = await listApis({ limit: 100 }, signal);
    if (!apis.ok) return apis;

    const formats = [...new Set(apis.data.apis.map((api) => api.responseFormat))];
    const results = await Promise.all(formats.map((format) => listCallbacks(format, signal)));
    const byFormat = new Map<string, CallbackInfo[]>();
    for (const [index, result] of results.entries()) {
      if (!result.ok) return result;
      byFormat.set(formats[index] ?? '', result.data.callbacks);
    }

    return {
      ok: true,
      meta: apis.meta,
      data: apis.data.apis.map((api) => ({ api, callbacks: byFormat.get(api.responseFormat) ?? [] })),
    };
  }, []);

  if (catalog.error) return <ErrorBanner error={catalog.error} onRetry={catalog.refetch} stale={!!catalog.data} />;
  if (catalog.isLoading || !catalog.data) return <p className="empty">{t('Cargando callbacks…', 'Loading callbacks…')}</p>;
  if (catalog.data.length === 0) return <p className="empty">{t('No hay APIs activas en C-TRD.', 'There are no active APIs in C-TRD.')}</p>;

  return (
    <div className="table-wrap">
      <table className="table help-table table--cards table--cards-single">
        <thead>
          <tr>
            <th scope="col">API</th>
            <th scope="col">Callback</th>
            <th scope="col">{t('Se cumple cuando', 'Met when')}</th>
          </tr>
        </thead>
        <tbody>
          {catalog.data.map(({ api, callbacks }) =>
            callbacks.length === 0 ? (
              <tr key={api.id} className="help-table__group">
                <td className="cell--main">
                  <strong>{api.name}</strong>
                  <div className="muted small">{api.nameProvider}</div>
                </td>
                <td colSpan={2} className="muted" data-label="Callback">
                  {t('Ningun callback lee el formato', 'No callback reads the format')} {api.responseFormat}.
                </td>
              </tr>
            ) : (
              callbacks.map((callback, index) => (
                <tr key={`${api.id}-${callback.id}`} className={index === 0 ? 'help-table__group' : undefined}>
                  {index === 0 && (
                    <td rowSpan={callbacks.length} className="cell--main">
                      <strong>{api.name}</strong>
                      <div className="muted small">{api.nameProvider}</div>
                    </td>
                  )}
                  <td data-label="Callback">
                    {callback.name}
                    <div className="muted small">
                      <code>{callback.id}</code>
                    </div>
                  </td>
                  <td data-label={t('Se cumple cuando', 'Met when')}>
                    {callback.description}
                    {callback.parameters.length > 0 && (
                      <div className="muted small">
                        {t('Parametros:', 'Parameters:')}{' '}
                        {callback.parameters.map((parameter, paramIndex) => (
                          <span key={parameter.name}>
                            {paramIndex > 0 && ', '}
                            <code>{parameter.name}</code>
                            {parameterRangeText(parameter) && ` (${parameterRangeText(parameter)})`}
                            {parameter.defaultValue !== null &&
                              t(` (por defecto ${parameter.defaultValue})`, ` (default ${parameter.defaultValue})`)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

const LIFECYCLE_DESCRIPTION: Localized = {
  es:
    'La alerta crea la oportunidad En Curso (con condiciones) o Activa (sin condiciones). En Curso pasa a Activa ' +
    'cuando se cumplen todas las condiciones o a Expirada si vence. Activa pasa a Finalizada cuando vence. En Curso ' +
    'y Activa pasan a Cancelada con una alerta de cancelacion.',
  en:
    'The alert creates the opportunity Ongoing (with conditions) or Active (without conditions). Ongoing becomes ' +
    'Active when all conditions are met, or Expired when it runs out. Active becomes Finished when it runs out. ' +
    'Ongoing and Active become Canceled with a cancel alert.',
};

// Textos de los nodos del diagrama
const NODE_TEXT = {
  alert: { es: 'Alerta', en: 'Alert' },
  ongoing: { es: 'En Curso', en: 'Ongoing' },
  waiting: { es: 'espera condiciones', en: 'waits for conditions' },
  expired: { es: 'Expirada', en: 'Expired' },
  final: { es: 'estado final', en: 'final state' },
  active: { es: 'Activa', en: 'Active' },
  confirmed: { es: 'senal confirmada', en: 'signal confirmed' },
  finished: { es: 'Finalizada', en: 'Finished' },
  canceled: { es: 'Cancelada', en: 'Canceled' },
  cancelAlert: { es: 'alerta con idCancel', en: 'alert with idCancel' },
} satisfies Record<string, Localized>;

// Diagrama de estados: horizontal en pantallas anchas y vertical en el celular (el CSS muestra uno u otro)
export function LifecycleDiagram() {
  const NODE = Object.fromEntries(Object.entries(NODE_TEXT).map(([key, text]) => [key, t(text)])) as Record<
    keyof typeof NODE_TEXT,
    string
  >;
  return (
    <div className="help-diagram">
      <svg viewBox="0 0 880 320" role="img" aria-labelledby="ciclo-svg-title" className="help-diagram__wide">
        <title id="ciclo-svg-title">{t(LIFECYCLE_DESCRIPTION)}</title>
        <defs>
          <marker id="ciclo-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" className="help-diagram__head" />
          </marker>
        </defs>

        <g className="help-diagram__edges" markerEnd="url(#ciclo-flecha)">
          <path d="M140 150 H228" />
          <path d="M380 150 H518" />
          <path d="M305 122 V68" />
          <path d="M75 178 V300 H640 V180" />
          <path d="M670 150 H728" />
          <path d="M330 178 L418 228" />
          <path d="M590 178 L502 228" />
        </g>

        <g className="help-diagram__labels">
          <text x="184" y="140" textAnchor="middle">
            {t('con condiciones', 'with conditions')}
          </text>
          <text x="449" y="140" textAnchor="middle">
            {t('todas Activas', 'all Active')}
          </text>
          <text x="449" y="172" textAnchor="middle">
            {t('(cron, cada minuto)', '(cron, every minute)')}
          </text>
          <text x="315" y="100">
            {t('vence: velas × temporalidad', 'runs out: candles × timeframe')}
          </text>
          <text x="699" y="140" textAnchor="middle">
            {t('vence', 'runs out')}
          </text>
          <text x="200" y="292" textAnchor="middle">
            {t('sin condiciones: nace Activa', 'no conditions: born Active')}
          </text>
        </g>

        <DiagramNode x={10} y={122} width={130} title={NODE.alert} subtitle="TradingView" />
        <DiagramNode x={230} y={122} width={150} title={NODE.ongoing} subtitle={NODE.waiting} status={OpportunityStatusTag.Ongoing} />
        <DiagramNode x={230} y={10} width={150} title={NODE.expired} subtitle={NODE.final} status={OpportunityStatusTag.Expired} />
        <DiagramNode x={520} y={122} width={150} title={NODE.active} subtitle={NODE.confirmed} status={OpportunityStatusTag.Active} />
        <DiagramNode x={730} y={122} width={140} title={NODE.finished} subtitle={NODE.final} status={OpportunityStatusTag.Finished} />
        <DiagramNode x={385} y={230} width={150} title={NODE.canceled} subtitle={NODE.cancelAlert} status={OpportunityStatusTag.Canceled} />
      </svg>

      <svg viewBox="0 0 340 416" role="img" aria-labelledby="ciclo-svg-title-compacto" className="help-diagram__compact">
        <title id="ciclo-svg-title-compacto">{t(LIFECYCLE_DESCRIPTION)}</title>
        <defs>
          <marker
            id="ciclo-flecha-compacto"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 z" className="help-diagram__head" />
          </marker>
        </defs>

        <g className="help-diagram__edges" markerEnd="url(#ciclo-flecha-compacto)">
          <path d="M140 66 L92 118" />
          <path d="M200 66 L248 118" />
          <path d="M130 148 H208" />
          <path d="M40 176 V348" />
          <path d="M300 176 V348" />
          <path d="M100 176 L140 238" />
          <path d="M240 176 L200 238" />
        </g>

        <g className="help-diagram__labels">
          <text x="104" y="88" textAnchor="end">
            {t('con condiciones', 'with conditions')}
          </text>
          <text x="236" y="88">
            {t('sin condiciones', 'no conditions')}
          </text>
          <text x="170" y="140" textAnchor="middle">
            {t('todas Activas', 'all Active')}
          </text>
          <text x="170" y="166" textAnchor="middle">
            {t('(cada minuto)', '(every minute)')}
          </text>
          <text x="48" y="316">
            {t('vence', 'runs out')}
          </text>
          <text x="48" y="330">
            {t('velas × temporalidad', 'candles × timeframe')}
          </text>
          <text x="292" y="316" textAnchor="end">
            {t('vence', 'runs out')}
          </text>
        </g>

        <DiagramNode x={110} y={10} width={120} title={NODE.alert} subtitle="TradingView" />
        <DiagramNode x={10} y={120} width={120} title={NODE.ongoing} subtitle={NODE.waiting} status={OpportunityStatusTag.Ongoing} />
        <DiagramNode x={210} y={120} width={120} title={NODE.active} subtitle={NODE.confirmed} status={OpportunityStatusTag.Active} />
        <DiagramNode x={110} y={240} width={120} title={NODE.canceled} subtitle={NODE.cancelAlert} status={OpportunityStatusTag.Canceled} />
        <DiagramNode x={10} y={350} width={120} title={NODE.expired} subtitle={NODE.final} status={OpportunityStatusTag.Expired} />
        <DiagramNode x={210} y={350} width={120} title={NODE.finished} subtitle={NODE.final} status={OpportunityStatusTag.Finished} />
      </svg>
    </div>
  );
}

// Catalogo real de razones de cancelacion: el id es lo que va en idCancel
export function CancelReasonCatalog() {
  const reasons = useApiQuery((signal) => listCatalogs(CatalogType.CancelReason, signal), []);

  if (reasons.error) return <ErrorBanner error={reasons.error} onRetry={reasons.refetch} stale={!!reasons.data} />;
  if (reasons.isLoading || !reasons.data) return <p className="empty">{t('Cargando razones de cancelacion…', 'Loading cancel reasons…')}</p>;
  if (reasons.data.catalogs.length === 0) return <p className="empty">{t('No hay razones de cancelacion en C-TRD.', 'There are no cancel reasons in C-TRD.')}</p>;

  return (
    <div className="table-wrap">
      <table className="table help-table table--cards table--cards-single">
        <thead>
          <tr>
            <th scope="col">{t('Razon', 'Reason')}</th>
            <th scope="col">idCancel</th>
            <th scope="col">{t('Descripcion', 'Description')}</th>
          </tr>
        </thead>
        <tbody>
          {reasons.data.catalogs.map((reason) => (
            <tr key={reason.id}>
              <td className="cell--main">
                <strong>{reason.name}</strong>
                <div className="muted small">{reason.tag}</div>
              </td>
              <td data-label="idCancel">
                <code>{reason.id}</code>
              </td>
              <td data-label={t('Descripcion', 'Description')}>{reason.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface DiagramNodeProps {
  x: number;
  y: number;
  width: number;
  title: string;
  subtitle: string;
  status?: string;
}

function DiagramNode({ x, y, width, title, subtitle, status }: DiagramNodeProps) {
  return (
    <g className="help-diagram__node" data-status={status}>
      <rect x={x} y={y} width={width} height={56} rx={10} />
      <text x={x + width / 2} y={y + 24} textAnchor="middle" className="help-diagram__title">
        {title}
      </text>
      <text x={x + width / 2} y={y + 42} textAnchor="middle" className="help-diagram__subtitle">
        {subtitle}
      </text>
    </g>
  );
}
