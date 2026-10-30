import type { ReactNode } from 'react';
import { listApis } from '../api/apis';
import { listCallbacks } from '../api/callbacks';
import { listCatalogs } from '../api/catalogs';
import { apiBaseUrl } from '../api/config';
import type { ApiResult } from '../api/types';
import { useApiQuery } from '../hooks/useApiQuery';
import type { ApiDefinition, CallbackInfo } from '../models/apiDefinition';
import { CatalogType } from '../models/catalog';
import { OpportunityStatusTag } from '../models/opportunity';
import { parameterRangeText } from './ApiParameterInput';
import { ErrorBanner } from './ErrorBanner';
import { StatusBadge } from './StatusBadge';

// Ayuda funcional de C-TRD. Lo que se explica aqui sale del codigo de C-TRD (controllers/hook.controller.go,
// data_validates/hook_data_validate.go, data_validates/operation_data_validate.go, cronjobs/check_conditions.go,
// cronjobs/check_opportunities.go, providers/callbacks.go, models/catalogs_model.go -> VisibleToUserFilter); si cambia
// alli, revisar

const SECTIONS = [
  { id: 'ayuda-resumen', label: 'Como encaja todo' },
  { id: 'ayuda-ciclo', label: 'Ciclo de vida' },
  { id: 'ayuda-triggers', label: 'Triggers y alertas' },
  { id: 'ayuda-visibilidad', label: 'Usuarios y visibilidad' },
  { id: 'ayuda-cancelar', label: 'Cancelar' },
  { id: 'ayuda-condiciones', label: 'Condiciones' },
  { id: 'ayuda-callbacks', label: 'Callbacks' },
  { id: 'ayuda-senales', label: 'Senales complejas' },
  { id: 'ayuda-recetas', label: 'Ejemplos' },
  { id: 'ayuda-problemas', label: 'Problemas frecuentes' },
] as const;

// El hash ya lo usa la navegacion (#/ayuda), asi que el indice hace scroll en lugar de usar anclas
function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="panel panel--padded help-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      {children}
    </section>
  );
}

const hookBodyExample = `{
  "idWebhook": "<id del webhook del trigger>",
  "price": {{close}},
  "metadatos": { "ticker": "{{ticker}}", "interval": "{{interval}}" },
  "stopLoss": [{ "price": 65000, "probability": 0.3 }],
  "takeProfit": [{ "price": 72000, "probability": 0.5 }]
}`;

const cancelBodyExample = `{
  "idWebhook": "<id del webhook del trigger>",
  "price": {{close}},
  "idCancel": "<id de la razon de cancelacion>"
}`;

// Enlace a otra seccion de la ayuda (el hash lo usa la navegacion, asi que hace scroll)
function SectionLink({ id, children }: { id: string; children: ReactNode }) {
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

export function HelpPage() {
  return (
    <main className="page page--narrow help">
      <div className="page__head">
        <div>
          <h1>Ayuda</h1>
          <p className="muted small">
            Como nace una oportunidad, como la mueven las condiciones y como combinarlas para armar senales.
          </p>
        </div>
      </div>

      <nav className="help-index" aria-label="En esta pagina">
        {SECTIONS.map((section) => (
          <button key={section.id} type="button" className="button button--small" onClick={() => scrollToSection(section.id)}>
            {section.label}
          </button>
        ))}
      </nav>

      <Section id="ayuda-resumen" title="Como encaja todo">
        <ol className="help-pipeline">
          <li>
            <strong>Trigger</strong>
            <span>La senal tecnica: una alerta de TradingView sobre un asset, con una accion (compra, venta…).</span>
          </li>
          <li>
            <strong>Oportunidad</strong>
            <span>Cada alerta del trigger abre una oportunidad, que copia los datos del trigger y sus condiciones.</span>
          </li>
          <li>
            <strong>Condiciones</strong>
            <span>El contexto: consultan una API cada cierto tiempo y quedan Activas o Inactivas.</span>
          </li>
          <li>
            <strong>Callback</strong>
            <span>La funcion que lee la respuesta de la API y decide si la condicion se cumple (si o no).</span>
          </li>
        </ol>
        <p>
          La idea: el trigger dice <em>cuando mirar</em> (precio y analisis tecnico) y las condiciones dicen{' '}
          <em>si el contexto acompana</em> (macro, sentimiento, interes, opciones…). Una oportunidad solo pasa a{' '}
          <strong>Activa</strong> cuando ambas cosas coinciden antes de que se acabe el tiempo, y se cierra sola al
          vencer (<strong>Finalizada</strong>) o antes con una alerta de cancelacion (<strong>Cancelada</strong>).
        </p>
      </Section>

      <Section id="ayuda-ciclo" title="Ciclo de vida de una oportunidad">
        <LifecycleDiagram />

        <div className="table-wrap">
          <table className="table help-table">
            <thead>
              <tr>
                <th scope="col">Estado</th>
                <th scope="col">Cuando entra</th>
                <th scope="col">Precio que guarda</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <StatusBadge tag={OpportunityStatusTag.Ongoing} label="En Curso" />
                </td>
                <td>Llega la alerta y el trigger tiene condiciones. Desde ese momento corre el plazo de expiracion.</td>
                <td>
                  <strong>Disparo</strong>: el <code>price</code> que envio TradingView.
                </td>
              </tr>
              <tr>
                <td>
                  <StatusBadge tag={OpportunityStatusTag.Active} label="Activa" />
                </td>
                <td>
                  En un ciclo del cronjob todas sus condiciones estan Activas y todavia no vencio. Si el trigger no tiene
                  condiciones, la oportunidad nace directamente Activa.
                </td>
                <td>
                  <strong>Activacion</strong>: precio de mercado del asset al activarse (si no se pudo obtener, queda
                  vacio). Sin condiciones, el mismo precio de la alerta.
                </td>
              </tr>
              <tr>
                <td>
                  <StatusBadge tag={OpportunityStatusTag.Expired} label="Expirada" />
                </td>
                <td>
                  Seguia En Curso cuando paso su fecha de expiracion: las condiciones no se cumplieron a tiempo. Es un
                  estado final.
                </td>
                <td>—</td>
              </tr>
              <tr>
                <td>
                  <StatusBadge tag={OpportunityStatusTag.Finished} label="Finalizada" />
                </td>
                <td>Seguia Activa cuando paso su fecha de expiracion (cronjob, cada minuto). Es un estado final.</td>
                <td>
                  <strong>Cierre</strong>: precio de mercado del asset al finalizar (si no se pudo obtener, queda vacio).
                </td>
              </tr>
              <tr>
                <td>
                  <StatusBadge tag={OpportunityStatusTag.Canceled} label="Cancelada" />
                </td>
                <td>
                  Llega una alerta del trigger con <code>idCancel</code> mientras la oportunidad esta En Curso o Activa.
                  Guarda tambien el motivo. Es un estado final (ver <SectionLink id="ayuda-cancelar">Cancelar</SectionLink>
                  ).
                </td>
                <td>
                  <strong>Cierre</strong>: el <code>price</code> que envio TradingView en la alerta de cancelacion.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Reglas que conviene recordar</h3>
        <ul className="help-list">
          <li>
            El cronjob corre <strong>cada minuto</strong>: evalua las condiciones que tocan, copia su estado a las
            oportunidades En Curso, activa las que tienen todo en verde, expira las En Curso vencidas y finaliza las
            Activas vencidas.
          </li>
          <li>
            <strong>Expiracion = maximo de velas × duracion de la vela del trigger</strong>, contado desde la alerta. Ej:
            5 velas de 4 horas = 20 h. Es a la vez el plazo para que se cumplan las condiciones y la vida maxima de la
            oportunidad: no se alarga al activarse, asi que una que se activa tarde queda Activa menos tiempo.
          </li>
          <li>
            Solo hay <strong>una oportunidad viva por trigger</strong>: si ya tiene una En Curso o Activa, una nueva alerta
            no crea otra (C-TRD responde con el id de la existente). Cuando se cierra (Expirada, Finalizada o
            Cancelada), la siguiente alerta abre una nueva.
          </li>
          <li>
            Una oportunidad Activa <strong>no vuelve atras</strong> aunque despues una condicion se desactive: sigue
            Activa hasta que vence (Finalizada) o se cancela.
          </li>
          <li>
            La oportunidad guarda una <strong>copia</strong> de los datos del trigger al nacer: editar el trigger no
            cambia las oportunidades que ya existen. Lo que si se actualiza es el estado de sus condiciones.
          </li>
          <li>Todos los precios estan en USD y las fechas se guardan en UTC (aqui se muestran en tu hora local).</li>
        </ul>
      </Section>

      <Section id="ayuda-triggers" title="Triggers y alertas de TradingView">
        <p>
          Un trigger define el asset, la accion, la temporalidad de vela, el maximo de velas y, opcionalmente, una lista
          de condiciones. Para que funcione hay que crear una alerta en TradingView que llame al webhook:
        </p>
        <dl className="kv kv--wide">
          <dt>Webhook</dt>
          <dd>
            <code>POST {apiBaseUrl}/hook/trading_view</code>
          </dd>
          <dt>Mensaje</dt>
          <dd>
            <pre className="code-block">{hookBodyExample}</pre>
          </dd>
        </dl>
        <ul className="help-list">
          <li>
            <code>idWebhook</code> y <code>price</code> (mayor a 0) son obligatorios. El <code>idWebhook</code> se
            muestra al crear o editar el trigger (no aparece en el listado). <code>metadatos</code> es un objeto libre
            que se guarda en la oportunidad.
          </li>
          <li>
            <code>stopLoss</code> y <code>takeProfit</code> son opcionales: listas de objetivos con <code>price</code>{' '}
            (mayor a 0) y <code>probability</code> opcional. Solo se guardan cuando la alerta crea la oportunidad; si ya
            habia una viva, se ignoran.
          </li>
          <li>
            <strong>Editar un trigger crea una version nueva con otro id</strong> y deja la anterior inactiva, pero
            conserva el <code>idWebhook</code>: la alerta no cambia y C-TRD la asigna a la version vigente. El historial
            se ve en{' '}
            <a href="#/triggers">Triggers</a> → detalle → <em>Mostrar detalle de versiones</em>.
          </li>
          <li>
            La regla de una oportunidad viva es por id: la version nueva puede abrir una oportunidad aunque la version
            anterior tenga una En Curso.
          </li>
        </ul>
      </Section>

      <Section id="ayuda-visibilidad" title="Usuarios y visibilidad">
        <p>
          La sesion es opcional. Solo el <strong>super usuario</strong> crea y edita triggers, crea condiciones y sube
          los CSV de Google Trends. Cada trigger y condicion guarda el usuario que lo creo y una{' '}
          <strong>visibilidad</strong> que decide quien ve sus oportunidades:
        </p>
        <dl className="kv kv--wide">
          <dt>Privado</dt>
          <dd>Solo el usuario que lo creo.</dd>
          <dt>Publico</dt>
          <dd>Todos, tambien quienes entran sin sesion.</dd>
          <dt>Lista privada</dt>
          <dd>El usuario que lo creo y los usuarios de la lista (ids de usuarios activos).</dd>
        </dl>
        <ul className="help-list">
          <li>
            Sin sesion, <a href="#/">Oportunidades</a> muestra solo las publicas. Con sesion muestra tambien las tuyas y
            las de las listas privadas donde estas. Los totales por estado cuentan solo las que puedes ver.
          </li>
          <li>
            La oportunidad copia el usuario y la visibilidad del trigger cuando nace. La visibilidad se elige al crear el
            trigger; editarlo crea una version nueva con el mismo usuario y la misma visibilidad.
          </li>
          <li>
            Los triggers y oportunidades creados antes de los usuarios no tienen visibilidad: esas oportunidades no las
            ve nadie, y las nuevas de esos triggers tampoco.
          </li>
          <li>Hoy solo las oportunidades se filtran por visibilidad; los listados de triggers y condiciones muestran todo.</li>
        </ul>
      </Section>

      <Section id="ayuda-cancelar" title="Cancelar una oportunidad">
        <p>
          Una oportunidad En Curso o Activa se cancela con otra alerta de TradingView al mismo webhook, con el id del
          webhook del trigger y una <strong>razon de cancelacion</strong> en <code>idCancel</code>. Sirve, por ejemplo, para una
          alerta de invalidacion de la senal (perdida de un nivel, cruce contrario…).
        </p>
        <dl className="kv kv--wide">
          <dt>Webhook</dt>
          <dd>
            <code>POST {apiBaseUrl}/hook/trading_view</code>
          </dd>
          <dt>Mensaje</dt>
          <dd>
            <pre className="code-block">{cancelBodyExample}</pre>
          </dd>
        </dl>
        <ul className="help-list">
          <li>
            La oportunidad pasa a <strong>Cancelada</strong> de inmediato y guarda el <code>price</code> como precio de
            cierre y el motivo, que se ve en el detalle de la oportunidad.
          </li>
          <li>
            Con <code>idCancel</code> la alerta nunca crea una oportunidad: si el trigger no tiene una En Curso o Activa,
            C-TRD rechaza la alerta.
          </li>
          <li>
            Cancela la oportunidad viva <strong>de la version vigente</strong> del trigger: una oportunidad abierta por
            una version anterior (antes de editarlo) ya no se puede cancelar con la alerta.
          </li>
        </ul>
        <h3>Razones de cancelacion disponibles</h3>
        <CancelReasonCatalog />
      </Section>

      <Section id="ayuda-condiciones" title="Que es una condicion">
        <p>
          Una condicion es una pregunta sobre el contexto del mercado que C-TRD se hace periodicamente. Se arma con:
        </p>
        <ul className="help-list">
          <li>
            <strong>Una API</strong> de un proveedor (FRED, Polymarket, Alpha Vantage, Google Trends…) con sus
            parametros (serie, mercado, asset…).
          </li>
          <li>
            <strong>Un callback</strong> que lee la respuesta y contesta si o no. Algunos callbacks aceptan{' '}
            <strong>parametros</strong> (ej: un umbral) que se fijan al crear la condicion; si no se envian se usa su
            valor por defecto.
          </li>
          <li>
            <strong>Un intervalo</strong> (minimo 60 s): cada cuanto se vuelve a preguntar.
          </li>
          <li>
            <strong>Un tag unico, un nombre y un tipo</strong> (catalogo de tipos de condicion: macro, politica
            monetaria, sentimiento…) para identificarla y clasificarla.
          </li>
        </ul>
        <p>Como se comporta:</p>
        <ul className="help-list">
          <li>
            Nace <strong>Inactiva</strong>. En cada evaluacion queda <strong>Activa</strong> si el callback dice si e{' '}
            <strong>Inactiva</strong> si dice no.
          </li>
          <li>
            Es un <strong>estado, no un evento</strong>: puede pasar de Activa a Inactiva y volver. Si ya esta Activa
            cuando llega la alerta, la oportunidad la copia Activa y puede activarse en el siguiente minuto.
          </li>
          <li>
            Si la API falla o el callback da error, <strong>el estado no cambia</strong> y se reintenta en el siguiente
            intervalo. La ultima evaluacion se ve en <a href="#/condiciones">Condiciones</a>.
          </li>
          <li>
            Es <strong>compartida</strong>: la misma condicion puede estar en muchos triggers y se evalua una sola vez
            para todos.
          </li>
        </ul>
      </Section>

      <Section id="ayuda-callbacks" title="Callbacks: como se relacionan con las condiciones">
        <ol className="help-pipeline">
          <li>
            <strong>API</strong>
            <span>Hace la peticion con los parametros de la condicion.</span>
          </li>
          <li>
            <strong>Formato de respuesta</strong>
            <span>Cada API declara la forma de su respuesta (ej: FRED_SERIES_OBSERVATIONS).</span>
          </li>
          <li>
            <strong>Callback</strong>
            <span>Solo los callbacks que saben leer ese formato se pueden elegir para esa API.</span>
          </li>
          <li>
            <strong>Si / No</strong>
            <span>Pone la condicion en Activa o Inactiva.</span>
          </li>
        </ol>
        <ul className="help-list">
          <li>
            Una misma API sirve para varias condiciones con <strong>distintos callbacks</strong>: la serie de FRED puede
            usarse para "en subida" o "en bajada", y con distintos parametros (otra serie).
          </li>
          <li>
            Los umbrales estan fijos en cada callback (ej: Polymarket 60% o mas). Un umbral distinto o una logica nueva
            requiere agregar un callback en C-TRD.
          </li>
        </ul>
        <h3>Callbacks disponibles por API</h3>
        <CallbackCatalog />
      </Section>

      <Section id="ayuda-senales" title="Como combinar condiciones para senales complejas">
        <div className="help-grid">
          <div className="help-card">
            <h3>Y (todas)</h3>
            <p>
              Es lo nativo: un trigger con varias condiciones solo se activa cuando <strong>todas</strong> estan Activas a
              la vez. Cada condicion que agregas filtra mas senales.
            </p>
          </div>
          <div className="help-card">
            <h3>O (alguna)</h3>
            <p>
              Crea <strong>varios triggers</strong> con el mismo asset y accion pero distintas condiciones, cada uno con
              su alerta en TradingView. Se activa el que encuentre su contexto primero.
            </p>
          </div>
          <div className="help-card">
            <h3>NO (negacion)</h3>
            <p>
              Usa el <strong>callback opuesto</strong>: zona baja en lugar de alta, bajada en lugar de subida. Ojo: no
              siempre cubren todo (en la FED puede que ninguna opcion llegue a 60%).
            </p>
          </div>
          <div className="help-card">
            <h3>Rangos</h3>
            <p>
              Fear and Greed tiene bandas que no se solapan. "Miedo o miedo extremo" es un O: dos triggers, uno con cada
              banda.
            </p>
          </div>
          <div className="help-card">
            <h3>Ventana de tiempo</h3>
            <p>
              El maximo de velas es el tiempo que das al contexto para alinearse despues de la alerta. Pocas velas =
              confirmacion inmediata; muchas = esperar a que el contexto acompane.
            </p>
          </div>
          <div className="help-card">
            <h3>Intervalo vs ventana</h3>
            <p>
              El intervalo de la condicion debe ser bastante menor que la ventana del trigger, y coherente con lo que
              cambia el dato: una serie mensual de FRED no necesita evaluarse cada minuto.
            </p>
          </div>
        </div>
        <p className="muted small">
          Una misma estrategia en varias temporalidades = un trigger por temporalidad, reutilizando las mismas
          condiciones.
        </p>
      </Section>

      <Section id="ayuda-recetas" title="Ejemplos de senales">
        <p className="muted small">
          Usan callbacks que existen en C-TRD; cada uno necesita que su API este configurada (mira el catalogo de arriba).
        </p>
        <div className="help-grid">
          <Recipe
            title="Compra en capitulacion"
            trigger="RSI en sobreventa en diario (TradingView), accion de compra/acumulacion, 5 velas de 1 dia."
            conditions={['Fear and Greed: Extreme Fear', 'FED: bajada de tasa probable']}
            idea="Panico en el sentimiento mientras el mercado descuenta liquidez a favor."
          />
          <Recipe
            title="Corto por liquidez que se contrae"
            trigger="Perdida de soporte en BTC, accion de venta, 3 velas de 1 dia."
            conditions={['FED: subida de tasa probable', 'Serie de FRED en bajada (ej: M2)', 'Dominancia de stablecoins mayor a 12%']}
            idea="El dinero sale del riesgo: tasas al alza, menos liquidez y refugio en stablecoins."
          />
          <Recipe
            title="Euforia minorista: distribuir"
            trigger="Maximo de rango en 4 horas, accion de venta parcial, 6 velas de 4 horas."
            conditions={['CSV de Google Trends en nuevo maximo', 'Fear and Greed: Extreme Greed']}
            idea="Cuando todo el mundo busca el activo y el sentimiento esta al limite, el riesgo se asimetriza."
          />
          <Recipe
            title="Rebote con cobertura en opciones"
            trigger="Rebote en soporte de una accion (ej: AAPL), accion de compra, 4 velas de 1 dia."
            conditions={['Put/Call ratio extremo']}
            idea="Un put/call extremo suele marcar exceso de cobertura o de euforia: confirma que el soporte es relevante."
          />
        </div>
      </Section>

      <Section id="ayuda-problemas" title="Problemas frecuentes">
        <dl className="help-faq">
          <dt>La alerta llega pero no aparece una oportunidad nueva</dt>
          <dd>
            El trigger ya tiene una oportunidad En Curso o Activa: C-TRD devuelve esa. Si el error es "El trigger enviado
            no existe", el trigger se edito y la alerta sigue usando el id viejo. Si la oportunidad se creo pero no se
            ve, revisa la <SectionLink id="ayuda-visibilidad">visibilidad</SectionLink> del trigger y con que usuario
            iniciaste sesion.
          </dd>
          <dt>La oportunidad no pasa a Activa</dt>
          <dd>
            Revisa en <a href="#/condiciones">Condiciones</a> el estado y la ultima evaluacion de cada una. Si la API
            falla, el estado no cambia. Si vencio la ventana, queda Expirada aunque luego se cumplan.
          </dd>
          <dt>La oportunidad Activa no tiene precio de activacion, o la Finalizada no tiene precio de cierre</dt>
          <dd>
            No se pudo consultar el precio de mercado del asset en ese ciclo; la activacion o el cierre no se bloquean por
            eso.
          </dd>
          <dt>La alerta de cancelacion es rechazada</dt>
          <dd>
            "La razon de cancelacion enviada no existe": el <code>idCancel</code> no es una de las razones de{' '}
            <SectionLink id="ayuda-cancelar">Cancelar</SectionLink>. "El trigger no tiene una oportunidad en curso o
            activa para cancelar": ya se cerro (vencio o se cancelo antes) o la alerta usa el id de una version vieja del
            trigger.
          </dd>
          <dt>La condicion de Google Trends no cambia</dt>
          <dd>
            Lee el ultimo CSV subido para el asset. Sube uno nuevo en <a href="#/google-trends">Google Trends</a> para
            actualizar la serie.
          </dd>
          <dt>Codigos de seguimiento</dt>
          <dd>
            Cada error muestra un codigo. Los que empiezan con <code>F</code> son del frontend (red, tiempo de espera…);
            el resto viene de C-TRD y sirve para buscar el origen en sus logs.
          </dd>
        </dl>
      </Section>
    </main>
  );
}

interface RecipeProps {
  title: string;
  trigger: string;
  conditions: string[];
  idea: string;
}

function Recipe({ title, trigger, conditions, idea }: RecipeProps) {
  return (
    <div className="help-card">
      <h3>{title}</h3>
      <p>
        <strong>Trigger:</strong> {trigger}
      </p>
      <p>
        <strong>Condiciones (todas):</strong>
      </p>
      <ul className="help-list">
        {conditions.map((condition) => (
          <li key={condition}>{condition}</li>
        ))}
      </ul>
      <p className="muted small">{idea}</p>
    </div>
  );
}

interface CallbackGroup {
  api: ApiDefinition;
  callbacks: CallbackInfo[];
}

// Catalogo real: las APIs activas y los callbacks compatibles con su formato de respuesta
function CallbackCatalog() {
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
  if (catalog.isLoading || !catalog.data) return <p className="empty">Cargando callbacks…</p>;
  if (catalog.data.length === 0) return <p className="empty">No hay APIs activas en C-TRD.</p>;

  return (
    <div className="table-wrap">
      <table className="table help-table">
        <thead>
          <tr>
            <th scope="col">API</th>
            <th scope="col">Callback</th>
            <th scope="col">Se cumple cuando</th>
          </tr>
        </thead>
        <tbody>
          {catalog.data.map(({ api, callbacks }) =>
            callbacks.length === 0 ? (
              <tr key={api.id}>
                <td>
                  <strong>{api.name}</strong>
                  <div className="muted small">{api.nameProvider}</div>
                </td>
                <td colSpan={2} className="muted">
                  Ningun callback lee el formato {api.responseFormat}.
                </td>
              </tr>
            ) : (
              callbacks.map((callback, index) => (
                <tr key={`${api.id}-${callback.id}`}>
                  {index === 0 && (
                    <td rowSpan={callbacks.length}>
                      <strong>{api.name}</strong>
                      <div className="muted small">{api.nameProvider}</div>
                    </td>
                  )}
                  <td>
                    {callback.name}
                    <div className="muted small">
                      <code>{callback.id}</code>
                    </div>
                  </td>
                  <td>
                    {callback.description}
                    {callback.parameters.length > 0 && (
                      <div className="muted small">
                        Parametros:{' '}
                        {callback.parameters.map((parameter, paramIndex) => (
                          <span key={parameter.name}>
                            {paramIndex > 0 && ', '}
                            <code>{parameter.name}</code>
                            {parameterRangeText(parameter) && ` (${parameterRangeText(parameter)})`}
                            {parameter.defaultValue !== null && ` (por defecto ${parameter.defaultValue})`}
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

// Diagrama de estados
function LifecycleDiagram() {
  return (
    <div className="help-diagram">
      <svg viewBox="0 0 880 320" role="img" aria-labelledby="ciclo-svg-title">
        <title id="ciclo-svg-title">
          La alerta crea la oportunidad En Curso (con condiciones) o Activa (sin condiciones). En Curso pasa a Activa
          cuando se cumplen todas las condiciones o a Expirada si vence. Activa pasa a Finalizada cuando vence. En Curso
          y Activa pasan a Cancelada con una alerta de cancelacion.
        </title>
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
            con condiciones
          </text>
          <text x="449" y="140" textAnchor="middle">
            todas Activas
          </text>
          <text x="449" y="172" textAnchor="middle">
            (cron, cada minuto)
          </text>
          <text x="315" y="100">
            vence: velas × temporalidad
          </text>
          <text x="699" y="140" textAnchor="middle">
            vence
          </text>
          <text x="200" y="292" textAnchor="middle">
            sin condiciones: nace Activa
          </text>
        </g>

        <DiagramNode x={10} y={122} width={130} title="Alerta" subtitle="TradingView" />
        <DiagramNode x={230} y={122} width={150} title="En Curso" subtitle="espera condiciones" status={OpportunityStatusTag.Ongoing} />
        <DiagramNode x={230} y={10} width={150} title="Expirada" subtitle="estado final" status={OpportunityStatusTag.Expired} />
        <DiagramNode x={520} y={122} width={150} title="Activa" subtitle="senal confirmada" status={OpportunityStatusTag.Active} />
        <DiagramNode x={730} y={122} width={140} title="Finalizada" subtitle="estado final" status={OpportunityStatusTag.Finished} />
        <DiagramNode x={385} y={230} width={150} title="Cancelada" subtitle="alerta con idCancel" status={OpportunityStatusTag.Canceled} />
      </svg>
    </div>
  );
}

// Catalogo real de razones de cancelacion: el id es lo que va en idCancel
function CancelReasonCatalog() {
  const reasons = useApiQuery((signal) => listCatalogs(CatalogType.CancelReason, signal), []);

  if (reasons.error) return <ErrorBanner error={reasons.error} onRetry={reasons.refetch} stale={!!reasons.data} />;
  if (reasons.isLoading || !reasons.data) return <p className="empty">Cargando razones de cancelacion…</p>;
  if (reasons.data.catalogs.length === 0) return <p className="empty">No hay razones de cancelacion en C-TRD.</p>;

  return (
    <div className="table-wrap">
      <table className="table help-table">
        <thead>
          <tr>
            <th scope="col">Razon</th>
            <th scope="col">idCancel</th>
            <th scope="col">Descripcion</th>
          </tr>
        </thead>
        <tbody>
          {reasons.data.catalogs.map((reason) => (
            <tr key={reason.id}>
              <td>
                <strong>{reason.name}</strong>
                <div className="muted small">{reason.tag}</div>
              </td>
              <td>
                <code>{reason.id}</code>
              </td>
              <td>{reason.description}</td>
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
