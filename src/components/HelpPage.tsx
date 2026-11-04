import { useEffect, type ReactNode } from 'react';
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
import {
  ConditionExamples,
  LinksGuide,
  MORE_TRIGGER_EXAMPLES,
  More,
  OtherSourcesGuide,
  TradingViewGuide,
  WalkthroughGuide,
} from './HelpGuide';
import { SeedwiseLogo } from './SeedwiseLogo';
import { StatusBadge } from './StatusBadge';

// Ayuda funcional de C-TRD. Lo que se explica aqui sale del codigo de C-TRD (controllers/hook.controller.go,
// data_validates/hook_data_validate.go, data_validates/operation_data_validate.go, cronjobs/check_conditions.go,
// cronjobs/check_opportunities.go, providers/callbacks.go, models/catalogs_model.go -> VisibleToUserFilter,
// data_validates/list_data_validate.go -> status de condiciones); si cambia alli, revisar. La guia extendida
// (TradingView, n8n, ejemplos, enlaces) esta en HelpGuide.tsx

const SECTIONS = [
  { id: 'ayuda-resumen', label: 'Como encaja todo' },
  { id: 'ayuda-ciclo', label: 'Ciclo de vida' },
  { id: 'ayuda-triggers', label: 'Triggers y alertas' },
  { id: 'ayuda-tradingview', label: 'TradingView' },
  { id: 'ayuda-origenes', label: 'n8n y otros origenes' },
  { id: 'ayuda-visibilidad', label: 'Usuarios y visibilidad' },
  { id: 'ayuda-cancelar', label: 'Cancelar' },
  { id: 'ayuda-condiciones', label: 'Condiciones' },
  { id: 'ayuda-callbacks', label: 'Callbacks' },
  { id: 'ayuda-senales', label: 'Senales complejas' },
  { id: 'ayuda-recetas', label: 'Ejemplos' },
  { id: 'ayuda-recorrido', label: 'Caso completo' },
  { id: 'ayuda-agentes', label: 'Agentes de IA' },
  { id: 'ayuda-problemas', label: 'Problemas frecuentes' },
  { id: 'ayuda-enlaces', label: 'Enlaces y glosario' },
] as const;

// El hash ya lo usa la navegacion (#/ayuda), asi que el indice hace scroll en lugar de usar anclas
function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// PDF sin dependencias: la ventana de impresion del navegador ("Guardar como PDF") con los estilos de @media print.
// Al imprimir (boton o Ctrl+P) se abren todos los <details> para que el PDF tenga la guia completa y despues quedan
// como estaban. El titulo del documento es el nombre de archivo que sugiere el navegador
function usePrintableGuide() {
  useEffect(() => {
    let opened: HTMLDetailsElement[] = [];
    let previousTitle = document.title;
    const before = () => {
      opened = [...document.querySelectorAll<HTMLDetailsElement>('.help details:not([open])')];
      opened.forEach((details) => (details.open = true));
      previousTitle = document.title;
      document.title = `seedwise-ayuda-${new Date().toISOString().slice(0, 10)}`;
    };
    const after = () => {
      opened.forEach((details) => (details.open = false));
      opened = [];
      document.title = previousTitle;
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);
}

// Portada e indice: solo se ven en el PDF (el indice de botones no sirve en papel)
function PrintCover() {
  const today = new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <header className="help-cover">
      <div className="help-cover__brand">
        <SeedwiseLogo className="help-cover__logo" />
        <span>seedwise.io</span>
      </div>
      <h1>Guia de uso</h1>
      <p className="tagline">Invierte como jardinero, no como apostador.</p>
      <p className="muted">
        Triggers, condiciones, oportunidades, TradingView, n8n y agentes de IA. Generada el {today} desde{' '}
        <code>{apiBaseUrl}</code>; los catalogos son los vigentes en ese momento.
      </p>
      <h2>Contenido</h2>
      <ol className="help-cover__toc">
        {SECTIONS.map((section) => (
          // En el PDF el ancla es un enlace interno a la seccion (en pantalla la portada no se muestra)
          <li key={section.id}>
            <a href={`#${section.id}`}>{section.label}</a>
          </li>
        ))}
      </ol>
    </header>
  );
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
  usePrintableGuide();
  return (
    <main className="page page--narrow help">
      <PrintCover />
      <div className="page__head help-head">
        <div>
          <h1>Ayuda</h1>
          <p className="tagline">Invierte como jardinero, no como apostador.</p>
          <p className="muted small">
            Como nace una oportunidad, como la mueven las condiciones y como combinarlas para armar senales.
          </p>
        </div>
        <button type="button" className="button help-pdf" onClick={() => window.print()}>
          Descargar PDF
        </button>
      </div>
      <p className="muted small help-pdf-hint">
        El PDF incluye la guia completa (los bloques plegados se abren). En la ventana de impresion elige{' '}
        <em>Guardar como PDF</em>.
      </p>

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
            <span>
              La senal tecnica: una alerta de TradingView (o de n8n, un script…) sobre un asset, con una accion (compra,
              venta…).
            </span>
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
          <table className="table help-table table--cards table--cards-single">
            <thead>
              <tr>
                <th scope="col">Estado</th>
                <th scope="col">Cuando entra</th>
                <th scope="col">Precio que guarda</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="cell--main">
                  <StatusBadge tag={OpportunityStatusTag.Ongoing} label="En Curso" />
                </td>
                <td data-label="Cuando entra">
                  Llega la alerta y el trigger tiene condiciones. Desde ese momento corre el plazo de expiracion.
                </td>
                <td data-label="Precio que guarda">
                  <strong>Disparo</strong>: el <code>price</code> que envio TradingView.
                </td>
              </tr>
              <tr>
                <td className="cell--main">
                  <StatusBadge tag={OpportunityStatusTag.Active} label="Activa" />
                </td>
                <td data-label="Cuando entra">
                  En un ciclo del cronjob todas sus condiciones estan Activas y todavia no vencio. Si el trigger no tiene
                  condiciones, la oportunidad nace directamente Activa.
                </td>
                <td data-label="Precio que guarda">
                  <strong>Activacion</strong>: precio de mercado del asset al activarse (si no se pudo obtener, queda
                  vacio). Sin condiciones, el mismo precio de la alerta.
                </td>
              </tr>
              <tr>
                <td className="cell--main">
                  <StatusBadge tag={OpportunityStatusTag.Expired} label="Expirada" />
                </td>
                <td data-label="Cuando entra">
                  Seguia En Curso cuando paso su fecha de expiracion: las condiciones no se cumplieron a tiempo. Es un
                  estado final.
                </td>
                <td data-label="Precio que guarda">—</td>
              </tr>
              <tr>
                <td className="cell--main">
                  <StatusBadge tag={OpportunityStatusTag.Finished} label="Finalizada" />
                </td>
                <td data-label="Cuando entra">
                  Seguia Activa cuando paso su fecha de expiracion (cronjob, cada minuto). Es un estado final.
                </td>
                <td data-label="Precio que guarda">
                  <strong>Cierre</strong>: precio de mercado del asset al finalizar (si no se pudo obtener, queda vacio).
                </td>
              </tr>
              <tr>
                <td className="cell--main">
                  <StatusBadge tag={OpportunityStatusTag.Canceled} label="Cancelada" />
                </td>
                <td data-label="Cuando entra">
                  Llega una alerta del trigger con <code>idCancel</code> mientras la oportunidad esta En Curso o Activa.
                  Guarda tambien el motivo. Es un estado final (ver <SectionLink id="ayuda-cancelar">Cancelar</SectionLink>
                  ).
                </td>
                <td data-label="Precio que guarda">
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
          de condiciones. Para que funcione hay que crear una alerta en TradingView (ver{' '}
          <SectionLink id="ayuda-tradingview">TradingView</SectionLink>) u otro sistema (ver{' '}
          <SectionLink id="ayuda-origenes">n8n y otros origenes</SectionLink>) que llame al webhook:
        </p>
        <dl className="kv kv--wide">
          <dt>Webhook</dt>
          <dd>
            <code>POST {apiBaseUrl}/hook/trigger</code>
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
          <li>
            El trigger puede guardar su <strong>codigo Pine</strong>. Al guardarlo, <code>{'{{ID_WEBHOOK}}'}</code> se
            reemplaza por el <code>idWebhook</code> del trigger, asi que el codigo ya trae el mensaje listo para la
            alerta. Al editar, si el codigo queda vacio se conserva el anterior.
          </li>
        </ul>
      </Section>

      <Section id="ayuda-tradingview" title="Que es TradingView y como conectarlo">
        <TradingViewGuide />
      </Section>

      <Section id="ayuda-origenes" title="Otros origenes: n8n, scripts y alertas manuales">
        <OtherSourcesGuide />
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
          <li>
            Hoy solo las oportunidades se filtran por visibilidad; los listados de triggers y condiciones no. Las
            condiciones si se filtran por estado: sin sesion o sin privilegio solo se ven las Activas e Inactivas; las
            pendientes de aprobacion y las no aprobadas solo las ve el super usuario.
          </li>
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
            <code>POST {apiBaseUrl}/hook/trigger</code>
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
        <ConditionExamples />
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
            Algunos callbacks tienen <strong>parametros</strong> que se fijan en cada condicion: los de umbral de Fear and
            Greed y de dominancia (BTC, USDT, OTHERS2, OTHERS3) reciben el umbral, con su rango validado al crearla. Asi
            "Fear and Greed menor a 25" y "menor a 15" son dos condiciones con el mismo callback.
          </li>
          <li>
            Los demas tienen el umbral fijo (ej: Polymarket 60% o mas, bandas de Fear and Greed). Un umbral fijo
            distinto o una logica nueva requiere agregar un callback en C-TRD.
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
        <More title="Mas ejemplos (umbrales, macro, n8n y sin condiciones)">
          <div className="help-grid">
            {MORE_TRIGGER_EXAMPLES.map((example) => (
              <Recipe key={example.title} {...example} />
            ))}
          </div>
        </More>
      </Section>

      <Section id="ayuda-recorrido" title="Un caso completo, minuto a minuto">
        <WalkthroughGuide />
      </Section>

      <Section id="ayuda-agentes" title="Agentes de IA">
        <p>
          Los agentes convierten ideas de inversion en condiciones y un trigger con su codigo Pine. Todo lo que crean
          queda <strong>Pendiente de aprobacion</strong> hasta que el super usuario lo revisa.
        </p>
        <ol className="help-list">
          <li>
            En <a href="#/agentes/tesis">Tesis de agentes</a> agregas una tesis (asset, accion e idea en texto libre). Las
            tesis forman una cola: la mas antigua primero. Solo se pueden borrar las pendientes.
          </li>
          <li>
            Cada viernes por la noche una corrida toma las 5 tesis pendientes mas antiguas; el resto espera a la semana
            siguiente. Los agentes (Condition Designer, Trigger Composer y Pine Author) disenan las condiciones, el
            trigger y el codigo, y C-TRD valida cada salida. Si Claude no esta disponible, la tesis vuelve a la cola.
          </li>
          <li>
            En <a href="#/agentes/corridas">Corridas de agentes</a> ves cada intento de cada agente, los problemas que se
            encontraron y que condiciones y trigger se crearon. Una corrida puede terminar Exitosa, Fallida o con{' '}
            <em>Requiere informacion</em> si la tesis no alcanzaba para disenar la senal.
          </li>
          <li>
            En <a href="#/agentes/revision">Revision de agentes</a> apruebas o rechazas. Mientras esten pendientes, el
            cronjob no evalua esas condiciones y el webhook rechaza esos triggers.
          </li>
        </ol>
        <ul className="help-list">
          <li>
            <strong>Aprobar un trigger</strong> lo deja Activo y aprueba sus condiciones pendientes, que pasan a Inactivas
            y empiezan a evaluarse. Despues crea la alerta en TradingView con el codigo Pine del trigger.
          </li>
          <li>
            <strong>Rechazar</strong> no se puede deshacer: queda <em>No aprobado</em>, no se borra, y ninguna condicion
            rechazada se puede usar en un trigger nuevo o aprobado. Una condicion que usa un trigger solo se rechaza
            despues de rechazar el trigger.
          </li>
          <li>
            Editar un trigger pendiente desde <a href="#/triggers">Triggers</a> no aplica: ese listado solo muestra los
            activos. Si hay que corregirlo, apruebalo y editalo despues, o rechazalo.
          </li>
        </ul>
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
          <dt>La alerta responde "El trigger esta pendiente de aprobacion" o "no fue aprobado"</dt>
          <dd>
            El trigger lo creo un agente. Apruebalo en <a href="#/agentes/revision">Revision de agentes</a>; uno rechazado
            no vuelve a recibir alertas.
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
          <dt>TradingView dispara la alerta pero C-TRD no recibe nada</dt>
          <dd>
            Revisa la columna <em>Webhook status</em> del registro de alertas. La URL tiene que ser la publica del entorno
            (https, puerto 80 o 443; <code>localhost</code> no sirve), la cuenta necesita un plan con webhooks y 2FA
            activado, y el mensaje tiene que ser JSON valido (cuidado con comillas y comas al editarlo a mano).
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

      <Section id="ayuda-enlaces" title="Enlaces utiles y glosario">
        <LinksGuide />
      </Section>
    </main>
  );
}

interface RecipeProps {
  title: string;
  source?: string;
  trigger: string;
  conditions: string[];
  idea: string;
}

function Recipe({ title, source = 'TradingView', trigger, conditions, idea }: RecipeProps) {
  return (
    <div className="help-card">
      <h3>{title}</h3>
      <p className="muted small">Origen: {source}</p>
      <p>
        <strong>Trigger:</strong> {trigger}
      </p>
      {conditions.length === 0 ? (
        <p>
          <strong>Condiciones:</strong> ninguna, nace Activa.
        </p>
      ) : (
        <>
          <p>
            <strong>Condiciones (todas):</strong>
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
      <table className="table help-table table--cards table--cards-single">
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
              <tr key={api.id} className="help-table__group">
                <td className="cell--main">
                  <strong>{api.name}</strong>
                  <div className="muted small">{api.nameProvider}</div>
                </td>
                <td colSpan={2} className="muted" data-label="Callback">
                  Ningun callback lee el formato {api.responseFormat}.
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
                  <td data-label="Se cumple cuando">
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

const LIFECYCLE_DESCRIPTION =
  'La alerta crea la oportunidad En Curso (con condiciones) o Activa (sin condiciones). En Curso pasa a Activa ' +
  'cuando se cumplen todas las condiciones o a Expirada si vence. Activa pasa a Finalizada cuando vence. En Curso ' +
  'y Activa pasan a Cancelada con una alerta de cancelacion.';

// Diagrama de estados: horizontal en pantallas anchas y vertical en el celular (el CSS muestra uno u otro)
function LifecycleDiagram() {
  return (
    <div className="help-diagram">
      <svg viewBox="0 0 880 320" role="img" aria-labelledby="ciclo-svg-title" className="help-diagram__wide">
        <title id="ciclo-svg-title">{LIFECYCLE_DESCRIPTION}</title>
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

      <svg viewBox="0 0 340 416" role="img" aria-labelledby="ciclo-svg-title-compacto" className="help-diagram__compact">
        <title id="ciclo-svg-title-compacto">{LIFECYCLE_DESCRIPTION}</title>
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
            con condiciones
          </text>
          <text x="236" y="88">
            sin condiciones
          </text>
          <text x="170" y="140" textAnchor="middle">
            todas Activas
          </text>
          <text x="170" y="166" textAnchor="middle">
            (cada minuto)
          </text>
          <text x="48" y="316">
            vence
          </text>
          <text x="48" y="330">
            velas × temporalidad
          </text>
          <text x="292" y="316" textAnchor="end">
            vence
          </text>
        </g>

        <DiagramNode x={110} y={10} width={120} title="Alerta" subtitle="TradingView" />
        <DiagramNode x={10} y={120} width={120} title="En Curso" subtitle="espera condiciones" status={OpportunityStatusTag.Ongoing} />
        <DiagramNode x={210} y={120} width={120} title="Activa" subtitle="senal confirmada" status={OpportunityStatusTag.Active} />
        <DiagramNode x={110} y={240} width={120} title="Cancelada" subtitle="alerta con idCancel" status={OpportunityStatusTag.Canceled} />
        <DiagramNode x={10} y={350} width={120} title="Expirada" subtitle="estado final" status={OpportunityStatusTag.Expired} />
        <DiagramNode x={210} y={350} width={120} title="Finalizada" subtitle="estado final" status={OpportunityStatusTag.Finished} />
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
      <table className="table help-table table--cards table--cards-single">
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
              <td className="cell--main">
                <strong>{reason.name}</strong>
                <div className="muted small">{reason.tag}</div>
              </td>
              <td data-label="idCancel">
                <code>{reason.id}</code>
              </td>
              <td data-label="Descripcion">{reason.description}</td>
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
