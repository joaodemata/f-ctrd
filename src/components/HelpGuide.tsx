import { Fragment, type ReactNode } from 'react';
import { apiBaseUrl } from '../api/config';

// Guia extendida de la ayuda: TradingView paso a paso, otros origenes de alertas (n8n, scripts), ejemplos completos
// y enlaces. Lo largo va en <details> para que la pagina se pueda recorrer rapido; al descargar el PDF HelpPage abre
// todos los <details>, asi el PDF trae la explicacion completa

const hookUrl = `${apiBaseUrl}/hook/trigger`;

// Bloque plegable: cerrado en pantalla, abierto en el PDF
export function More({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="help-more">
      <summary>{title}</summary>
      <div className="help-more__body">{children}</div>
    </details>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="help-external">
      {children}
    </a>
  );
}

// ---------- TradingView ----------

// {{ID_WEBHOOK}} lo reemplaza C-TRD al guardar el codigo del trigger; alert() arma el mensaje en Pine, por eso el
// precio va con str.tostring y no con el placeholder {{close}} de la ventana de alertas
const pineAlertExample = `//@version=6
indicator("RSI en sobreventa - seedwise", overlay = false)

rsi = ta.rsi(close, 14)
plot(rsi, "RSI")
hline(30)

// Senal: el RSI cruza hacia abajo los 30 al cierre de la vela
if ta.crossunder(rsi, 30)
    alert('{"idWebhook": "{{ID_WEBHOOK}}", "price": ' + str.tostring(close) +
         ', "metadatos": {"ticker": "' + syminfo.tickerid + '", "rsi": ' + str.tostring(rsi, "#.##") + '}}',
         alert.freq_once_per_bar_close)`;

const pineCancelExample = `// Invalidacion: el precio cierra por debajo del minimo de las ultimas 20 velas
lowest20 = ta.lowest(low, 20)[1]
if close < lowest20
    alert('{"idWebhook": "{{ID_WEBHOOK}}", "price": ' + str.tostring(close) +
         ', "idCancel": "<id de la razon de cancelacion>"}', alert.freq_once_per_bar_close)`;

const alertMessageExample = `{
  "idWebhook": "<id del webhook del trigger>",
  "price": {{close}},
  "metadatos": { "ticker": "{{ticker}}", "interval": "{{interval}}", "time": "{{timenow}}" }
}`;

export function TradingViewGuide() {
  return (
    <>
      <p>
        <ExternalLink href="https://www.tradingview.com/">TradingView</ExternalLink> es una plataforma de graficos y
        analisis tecnico. Tiene su propio lenguaje, <strong>Pine Script</strong>, para escribir indicadores y
        estrategias, y un sistema de <strong>alertas</strong> que, cuando se cumple algo en el grafico, puede hacer un{' '}
        <code>POST</code> a una URL (webhook). C-TRD usa ese webhook: cada alerta es el disparo de un trigger.
      </p>
      <ul className="help-list">
        <li>
          Los webhooks <strong>no estan en el plan gratuito</strong>: hace falta un plan pago y tener activada la
          verificacion en dos pasos (2FA) en la cuenta.
        </li>
        <li>
          TradingView solo llama a URLs en los puertos <strong>80 y 443</strong> (http/https) y por IPv4, y espera la
          respuesta unos 3 segundos. Por eso no puede llamar a un C-TRD local (<code>localhost:8080</code>): usa la URL
          publica del entorno.
        </li>
        <li>
          En el mensaje de la ventana de alertas se pueden usar <strong>placeholders</strong> que TradingView
          reemplaza al disparar: <code>{'{{close}}'}</code>, <code>{'{{ticker}}'}</code>,{' '}
          <code>{'{{interval}}'}</code>, <code>{'{{timenow}}'}</code>, <code>{'{{volume}}'}</code>…
        </li>
      </ul>

      <More title="Paso a paso: del trigger a la alerta">
        <ol className="help-list">
          <li>
            Crea el trigger en <a href="#/triggers/nuevo">Nuevo trigger</a> (asset, accion, temporalidad, maximo de
            velas y condiciones). Al guardarlo, C-TRD muestra el <code>idWebhook</code>: copialo, es lo que identifica
            al trigger en cada alerta.
          </li>
          <li>
            En TradingView abre el grafico del mismo asset y en la <strong>misma temporalidad</strong> que el trigger.
            La expiracion de la oportunidad se calcula con la temporalidad del trigger, no con la del grafico.
          </li>
          <li>
            Agrega el indicador o la estrategia que genera la senal. Si el trigger tiene codigo Pine, abre el Pine
            Editor, pega el codigo (ya trae el <code>idWebhook</code>) y <em>Agregar al grafico</em>.
          </li>
          <li>
            Crea la alerta (icono del reloj o <kbd>Alt</kbd>+<kbd>A</kbd>). En <em>Condicion</em> elige el
            indicador: con <code>alert()</code> en el codigo usa <em>Cualquier llamada a la funcion alert()</em>; con
            una condicion del indicador elige la condicion y escribe el mensaje a mano.
          </li>
          <li>
            En <em>Notificaciones</em> marca <strong>URL del webhook</strong> y pega:
            <pre className="code-block">{hookUrl}</pre>
          </li>
          <li>
            Si el mensaje lo escribes tu (sin <code>alert()</code>), tiene que ser JSON valido:
            <pre className="code-block">{alertMessageExample}</pre>
          </li>
          <li>
            Pon una frecuencia de <strong>una vez por cierre de vela</strong> para no disparar con velas que todavia se
            mueven, y una expiracion larga (o sin expiracion si tu plan lo permite).
          </li>
          <li>
            Prueba: cuando la alerta se dispare, la oportunidad aparece en <a href="#/">Oportunidades</a> En Curso (o
            Activa si el trigger no tiene condiciones). La columna <em>Webhook status</em> del registro de alertas de TradingView muestra si el webhook
            fallo.
          </li>
        </ol>
      </More>

      <More title="Ejemplo de codigo Pine con alert()">
        <p>
          Indicador que avisa cuando el RSI de 14 cruza hacia abajo los 30. El JSON se arma dentro de{' '}
          <code>alert()</code>; <code>{'{{ID_WEBHOOK}}'}</code> lo reemplaza C-TRD al guardar el codigo en el trigger.
        </p>
        <pre className="code-block code-block--tall">{pineAlertExample}</pre>
        <p>
          La misma idea sirve para cancelar: una segunda llamada a <code>alert()</code> con <code>idCancel</code>{' '}
          cuando la senal se invalida (ver la seccion Cancelar):
        </p>
        <pre className="code-block code-block--tall">{pineCancelExample}</pre>
        <p className="muted small">
          Con una sola alerta de tipo <em>alert()</em> en TradingView llegan los dos mensajes: el de disparo y el de
          cancelacion.
        </p>
      </More>
    </>
  );
}

// ---------- Otros origenes ----------

const curlExample = `curl -X POST ${hookUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"idWebhook": "<id del webhook>", "price": 67250.5, "metadatos": {"origen": "manual"}}'`;

const pythonExample = `import requests

respuesta = requests.post(
    "${hookUrl}",
    json={
        "idWebhook": "<id del webhook>",
        "price": 67250.5,
        "metadatos": {"origen": "script", "motivo": "ruptura de rango"},
    },
    timeout=10,
)
print(respuesta.status_code, respuesta.json()["message"])`;

const n8nBodyExample = `{
  "idWebhook": "<id del webhook>",
  "price": {{ $json.price }},
  "metadatos": { "origen": "n8n", "workflow": "{{ $workflow.name }}" }
}`;

export function OtherSourcesGuide() {
  return (
    <>
      <p>
        El webhook <code>POST {hookUrl}</code> no es exclusivo de TradingView: cualquier sistema que pueda hacer un{' '}
        <code>POST</code> con JSON puede disparar un trigger. Solo necesita el <code>idWebhook</code> y el{' '}
        <code>price</code>; el resto del cuerpo es igual (metadatos, stop loss, take profit, <code>idCancel</code>).
      </p>
      <div className="help-grid">
        <div className="help-card">
          <h3>n8n, Make o Zapier</h3>
          <p>
            Flujos sin codigo: un disparador (horario, RSS, Telegram, otra API) seguido de un nodo HTTP que llama al
            webhook.
          </p>
        </div>
        <div className="help-card">
          <h3>Scripts y bots</h3>
          <p>Python, Node o un cron propio que calcule su senal (on-chain, noticias, otro exchange) y avise a C-TRD.</p>
        </div>
        <div className="help-card">
          <h3>Manual</h3>
          <p>Un <code>curl</code> o Postman para registrar una idea propia como oportunidad o probar un trigger.</p>
        </div>
      </div>
      <ul className="help-list">
        <li>
          El <strong>precio lo pone quien envia</strong>: TradingView lo saca del grafico, pero n8n o un script tienen
          que consultarlo (ej: la API del exchange) antes de llamar al webhook.
        </li>
        <li>
          El trigger igual necesita <strong>temporalidad y maximo de velas</strong>: definen cuanto tiempo vive la
          oportunidad (ej: 4 velas de 1 hora = 4 h), aunque el origen no use velas.
        </li>
        <li>
          El webhook no pide sesion: <strong>el <code>idWebhook</code> funciona como clave</strong>. No lo publiques;
          quien lo tenga puede abrir y cancelar oportunidades de ese trigger.
        </li>
        <li>
          Las reglas son las mismas que con TradingView: una oportunidad viva por trigger, los pendientes de aprobacion
          rechazan alertas y la cancelacion necesita una oportunidad En Curso o Activa.
        </li>
      </ul>

      <More title="Ejemplo con n8n: alerta por precio cada 15 minutos">
        <ol className="help-list">
          <li>
            <strong>Schedule Trigger</strong>: cada 15 minutos.
          </li>
          <li>
            <strong>HTTP Request</strong> (GET) al precio del asset, por ejemplo{' '}
            <code>https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT</code>. Devuelve{' '}
            <code>{'{ "symbol": "BTCUSDT", "price": "67250.50" }'}</code>.
          </li>
          <li>
            <strong>IF</strong>: <code>{'{{ Number($json.price) }}'}</code> menor a tu nivel (ej: 60000). Solo la rama
            verdadera sigue.
          </li>
          <li>
            <strong>HTTP Request</strong> (POST) a <code>{hookUrl}</code>, <em>Body Content Type</em> JSON, con el
            cuerpo:
            <pre className="code-block">{n8nBodyExample}</pre>
          </li>
        </ol>
        <p className="muted small">
          Si el precio sigue debajo del nivel, las llamadas siguientes no crean oportunidades nuevas mientras haya una
          viva: C-TRD devuelve la existente. Para evitar llamadas de mas, guarda en n8n si ya avisaste.
        </p>
      </More>

      <More title="Ejemplos con curl y Python">
        <pre className="code-block">{curlExample}</pre>
        <pre className="code-block code-block--tall">{pythonExample}</pre>
        <p className="muted small">
          La respuesta es el sobre de C-TRD: <code>status</code> SUCCESS o FAIL, <code>message</code> y{' '}
          <code>tracking</code>. Un FAIL responde 400 con el motivo (trigger inexistente, pendiente de aprobacion…).
        </p>
      </More>
    </>
  );
}

// ---------- Ejemplos de condiciones ----------

interface ConditionExample {
  name: string;
  callback: string;
  parameters: string;
  interval: string;
  use: string;
}

const CONDITION_EXAMPLES: ConditionExample[] = [
  {
    name: 'Miedo por debajo de 25',
    callback: 'Fear and Greed menor al umbral',
    parameters: 'Umbral: 25',
    interval: '1 hora (3600 s)',
    use: 'Compras contrarias: el sentimiento esta en panico.',
  },
  {
    name: 'Codicia extrema',
    callback: 'Fear and Greed: Extreme Greed',
    parameters: '—',
    interval: '1 hora',
    use: 'Tomar ganancias o no perseguir el precio.',
  },
  {
    name: 'Altcoins ganan dominancia',
    callback: 'Dominancia de OTHERS2 mayor al umbral',
    parameters: 'Umbral (%): 42',
    interval: '4 horas',
    use: 'Senales de compra en altcoins cuando el dinero rota fuera de BTC.',
  },
  {
    name: 'Refugio en USDT',
    callback: 'Dominancia de USDT mayor al umbral',
    parameters: 'Umbral (%): 5',
    interval: '1 hora',
    use: 'Filtro para ventas: el mercado se pasa a stablecoins.',
  },
  {
    name: 'Liquidez creciente (M2)',
    callback: 'Serie de FRED en subida',
    parameters: 'Serie M2SL (en los parametros de la API)',
    interval: '1 dia',
    use: 'Contexto macro alcista para compras de largo plazo. La serie es mensual: no hace falta evaluarla mas seguido.',
  },
  {
    name: 'FED recorta tasas',
    callback: 'FED: bajada de tasa probable',
    parameters: '— (umbral fijo 60%)',
    interval: '6 horas',
    use: 'Viento a favor para activos de riesgo.',
  },
  {
    name: 'Busquedas en maximo',
    callback: 'CSV de Google Trends en nuevo maximo',
    parameters: '— (lee el ultimo CSV subido)',
    interval: '1 dia',
    use: 'Euforia minorista: filtro para ventas parciales.',
  },
  {
    name: 'Cobertura extrema en opciones',
    callback: 'Put/Call ratio extremo',
    parameters: '—',
    interval: '1 dia',
    use: 'Confirmar soportes en acciones con miedo o euforia en opciones.',
  },
];

export function ConditionExamples() {
  return (
    <More title="Ejemplos de condiciones">
      <p className="muted small">
        Nombres y valores de ejemplo: ajusta los umbrales a tu estrategia. Los callbacks y sus parametros reales estan en
        la tabla de Callbacks.
      </p>
      <div className="table-wrap">
        <table className="table help-table table--cards table--cards-single">
          <thead>
            <tr>
              <th scope="col">Condicion</th>
              <th scope="col">Callback</th>
              <th scope="col">Parametros</th>
              <th scope="col">Intervalo</th>
              <th scope="col">Para que</th>
            </tr>
          </thead>
          <tbody>
            {CONDITION_EXAMPLES.map((example) => (
              <tr key={example.name}>
                <td className="cell--main">
                  <strong>{example.name}</strong>
                </td>
                <td data-label="Callback">{example.callback}</td>
                <td data-label="Parametros">{example.parameters}</td>
                <td data-label="Intervalo">{example.interval}</td>
                <td data-label="Para que">{example.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </More>
  );
}

// ---------- Ejemplo de punta a punta ----------

interface TimelineStep {
  time: string;
  text: ReactNode;
}

const TIMELINE: TimelineStep[] = [
  {
    time: 'Lunes 08:00',
    text: (
      <>
        Trigger <strong>BTC: compra en capitulacion</strong>: accion compra, velas de 4 horas, maximo 6 velas (24 h).
        Condiciones: <em>Miedo por debajo de 25</em> (cada hora) y <em>FED recorta tasas</em> (cada 6 horas).
      </>
    ),
  },
  {
    time: 'Lunes 12:00',
    text: (
      <>
        Cierra una vela de 4 h con el RSI cruzando los 30. TradingView llama al webhook con <code>price</code> 61 800.
        Nace la oportunidad <strong>En Curso</strong> con precio de disparo 61 800 y expira el martes 12:00.
      </>
    ),
  },
  {
    time: 'Lunes 12:01',
    text: (
      <>
        El cronjob copia el estado de las condiciones: la FED ya estaba Activa, el Fear and Greed esta en 31 (Inactiva).
        Sigue En Curso.
      </>
    ),
  },
  {
    time: 'Lunes 15:00',
    text: (
      <>
        Otra alerta del mismo trigger: no crea una oportunidad nueva, C-TRD responde con la que esta viva.
      </>
    ),
  },
  {
    time: 'Lunes 21:00',
    text: (
      <>
        El Fear and Greed baja a 22 y la condicion pasa a Activa. En ese minuto todas estan Activas: la oportunidad
        pasa a <strong>Activa</strong> y guarda el precio de activacion (ej: 60 900).
      </>
    ),
  },
  {
    time: 'Martes 12:00',
    text: (
      <>
        Vence: pasa a <strong>Finalizada</strong> con el precio de cierre (ej: 63 400). La proxima alerta abre una
        oportunidad nueva.
      </>
    ),
  },
];

export function WalkthroughGuide() {
  return (
    <>
      <p>Un caso completo, con horas en UTC, para ver como se mueve una oportunidad:</p>
      <ol className="help-timeline">
        {TIMELINE.map((step) => (
          <li key={step.time}>
            <span className="help-timeline__time">{step.time}</span>
            <span>{step.text}</span>
          </li>
        ))}
      </ol>
      <More title="Y si las cosas salen distinto">
        <ul className="help-list">
          <li>
            Si el Fear and Greed nunca baja de 25 antes del martes 12:00, la oportunidad queda <strong>Expirada</strong>
            : la senal tecnica no tuvo el contexto a tiempo.
          </li>
          <li>
            Si el lunes 18:00 el precio pierde el minimo de 20 velas y llega la alerta con <code>idCancel</code>, queda{' '}
            <strong>Cancelada</strong> con el precio de esa alerta como cierre, este En Curso o Activa.
          </li>
          <li>
            Si despues de activarse el Fear and Greed sube a 40, la oportunidad <strong>sigue Activa</strong>: las
            condiciones solo cuentan para activar.
          </li>
          <li>
            Si se edita el trigger el lunes 14:00, la version nueva conserva el <code>idWebhook</code>: la alerta de las
            15:00 abre una oportunidad nueva para la version nueva, y la anterior sigue su curso sin poder cancelarse
            con la alerta.
          </li>
        </ul>
      </More>
    </>
  );
}

// ---------- Mas ejemplos de triggers ----------

export interface TriggerExample {
  title: string;
  source: string;
  trigger: string;
  conditions: string[];
  idea: string;
}

export const MORE_TRIGGER_EXAMPLES: TriggerExample[] = [
  {
    title: 'Rotacion a altcoins',
    source: 'TradingView',
    trigger: 'ETH/BTC rompe la resistencia en diario, accion de compra en ETH, 7 velas de 1 dia.',
    conditions: ['Dominancia de OTHERS2 mayor al umbral (42)', 'Dominancia de BTC menor al umbral (55)'],
    idea: 'La ruptura tecnica solo cuenta si el dinero realmente sale de BTC hacia el resto.',
  },
  {
    title: 'Acumulacion macro de largo plazo',
    source: 'TradingView',
    trigger: 'Precio de BTC sobre la media de 200 semanas, accion de acumulacion, 4 velas de 1 semana.',
    conditions: ['Serie de FRED en subida (M2SL)', 'FED: bajada de tasa probable'],
    idea: 'Tendencia de fondo alcista con liquidez creciente: compras escalonadas sin mirar el corto plazo.',
  },
  {
    title: 'Alerta de precio desde n8n',
    source: 'n8n',
    trigger: 'Un flujo consulta el precio cada 15 minutos y llama al webhook si BTC baja de un nivel. Accion compra, 8 velas de 1 hora.',
    conditions: ['Fear and Greed menor al umbral (30)'],
    idea: 'Ordenes de compra por niveles sin TradingView, filtradas por sentimiento.',
  },
  {
    title: 'Sin condiciones: registro de senales',
    source: 'TradingView o script',
    trigger: 'Cualquier senal, accion de observacion, 3 velas de 1 dia, sin condiciones.',
    conditions: [],
    idea: 'La oportunidad nace Activa con el precio de la alerta: sirve para medir como rinde una senal sola antes de filtrarla.',
  },
];

// ---------- Enlaces y glosario ----------

const LINKS: Array<{ group: string; items: Array<{ href: string; label: string; note: string }> }> = [
  {
    group: 'TradingView',
    items: [
      { href: 'https://www.tradingview.com/support/solutions/43000529348-how-to-configure-webhook-alerts/', label: 'Webhooks', note: 'requisitos, puertos y formato' },
      { href: 'https://www.tradingview.com/pine-script-docs/', label: 'Manual de Pine Script', note: 'indicadores, estrategias y alert()' },
      { href: 'https://www.tradingview.com/pine-script-reference/', label: 'Referencia de Pine Script', note: 'todas las funciones' },
    ],
  },
  {
    group: 'Automatizacion',
    items: [
      { href: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/', label: 'n8n: nodo HTTP Request', note: 'llamar al webhook desde un flujo' },
      { href: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/', label: 'n8n: Schedule Trigger', note: 'ejecutar un flujo cada cierto tiempo' },
    ],
  },
  {
    group: 'Fuentes de las condiciones',
    items: [
      { href: 'https://coinmarketcap.com/charts/fear-and-greed-index/', label: 'Fear and Greed de CoinMarketCap', note: 'indice y dominancias' },
      { href: 'https://fred.stlouisfed.org/', label: 'FRED', note: 'series macro (M2SL, tasas, empleo…)' },
      { href: 'https://polymarket.com/', label: 'Polymarket', note: 'probabilidades de la FED' },
      { href: 'https://trends.google.com/', label: 'Google Trends', note: 'exportar el CSV de interes' },
      { href: 'https://www.alphavantage.co/documentation/', label: 'Alpha Vantage', note: 'datos de acciones y opciones' },
    ],
  },
];

const GLOSSARY: Array<[string, string]> = [
  ['Asset', 'El activo que se sigue: BTC, ETH, AAPL…'],
  ['Accion', 'Que se sugiere hacer con la senal: compra, venta, acumulacion…'],
  ['Temporalidad', 'Duracion de cada vela del trigger (1 h, 4 h, 1 dia…). Con el maximo de velas define la expiracion.'],
  ['Webhook', 'URL que recibe un POST cuando pasa algo. En C-TRD es /hook/trigger.'],
  ['idWebhook', 'Identificador del trigger para las alertas. Se mantiene al editar el trigger.'],
  ['Callback', 'Funcion de C-TRD que lee la respuesta de una API y responde si o no.'],
  ['Pine Script', 'Lenguaje de TradingView para indicadores, estrategias y alertas.'],
  ['Stop loss / take profit', 'Niveles de salida por perdida o ganancia que puede enviar la alerta.'],
  ['UTC', 'Hora universal: C-TRD guarda todo en UTC y la web lo muestra en tu hora local.'],
];

export function LinksGuide() {
  return (
    <>
      <div className="help-grid">
        {LINKS.map((group) => (
          <div key={group.group} className="help-card">
            <h3>{group.group}</h3>
            <ul className="help-list">
              {group.items.map((item) => (
                <li key={item.href}>
                  <ExternalLink href={item.href}>{item.label}</ExternalLink>
                  <span className="muted small"> — {item.note}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <h3>Glosario</h3>
      <dl className="kv kv--wide">
        {GLOSSARY.map(([term, definition]) => (
          <Fragment key={term}>
            <dt>{term}</dt>
            <dd>{definition}</dd>
          </Fragment>
        ))}
      </dl>
    </>
  );
}
