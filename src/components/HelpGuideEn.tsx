import { Fragment, type ReactNode } from 'react';
import { apiBaseUrl } from '../api/config';
import { ExternalLink, More } from './HelpGuide';

// Version en ingles de HelpGuide.tsx (misma estructura y mismos exports). Al cambiar la guia en espanol hay que
// actualizar esta tambien. Los nombres de callbacks, condiciones y catalogos que vienen de C-TRD estan en espanol; aqui
// se describen en ingles

const hookUrl = `${apiBaseUrl}/hook/trigger`;

// ---------- TradingView ----------

const pineAlertExample = `//@version=6
indicator("Oversold RSI - seedwise", overlay = false)

rsi = ta.rsi(close, 14)
plot(rsi, "RSI")
hline(30)

// Signal: the RSI crosses below 30 at the close of the candle
if ta.crossunder(rsi, 30)
    alert('{"idWebhook": "{{ID_WEBHOOK}}", "price": ' + str.tostring(close) +
         ', "metadatos": {"ticker": "' + syminfo.tickerid + '", "rsi": ' + str.tostring(rsi, "#.##") + '}}',
         alert.freq_once_per_bar_close)`;

const pineCancelExample = `// Invalidation: the price closes below the low of the last 20 candles
lowest20 = ta.lowest(low, 20)[1]
if close < lowest20
    alert('{"idWebhook": "{{ID_WEBHOOK}}", "price": ' + str.tostring(close) +
         ', "idCancel": "<id of the cancel reason>"}', alert.freq_once_per_bar_close)`;

const alertMessageExample = `{
  "idWebhook": "<webhook id of the trigger>",
  "price": {{close}},
  "metadatos": { "ticker": "{{ticker}}", "interval": "{{interval}}", "time": "{{timenow}}" }
}`;

export function TradingViewGuide() {
  return (
    <>
      <p>
        <ExternalLink href="https://www.tradingview.com/">TradingView</ExternalLink> is a charting and technical
        analysis platform. It has its own language, <strong>Pine Script</strong>, to write indicators and strategies, and
        an <strong>alerts</strong> system that, when something happens on the chart, can make a <code>POST</code> to a
        URL (webhook). C-TRD uses that webhook: each alert fires a trigger.
      </p>
      <ul className="help-list">
        <li>
          Webhooks <strong>are not in the free plan</strong>: you need a paid plan and two-factor authentication (2FA)
          enabled on the account.
        </li>
        <li>
          TradingView only calls URLs on ports <strong>80 and 443</strong> (http/https) over IPv4, and waits about 3
          seconds for the response. That is why it cannot call a local C-TRD (<code>localhost:8080</code>): use the
          public URL of the environment.
        </li>
        <li>
          In the alert dialog message you can use <strong>placeholders</strong> that TradingView replaces when it fires:{' '}
          <code>{'{{close}}'}</code>, <code>{'{{ticker}}'}</code>, <code>{'{{interval}}'}</code>,{' '}
          <code>{'{{timenow}}'}</code>, <code>{'{{volume}}'}</code>…
        </li>
      </ul>

      <More title="Step by step: from the trigger to the alert">
        <ol className="help-list">
          <li>
            Create the trigger in <a href="#/triggers/nuevo">New trigger</a> (asset, action, timeframe, max candles and
            conditions). When you save it, C-TRD shows the <code>idWebhook</code>: copy it, it identifies the trigger in
            every alert.
          </li>
          <li>
            In TradingView open the chart of the same asset and in the <strong>same timeframe</strong> as the trigger.
            The expiration of the opportunity is computed with the trigger's timeframe, not the chart's.
          </li>
          <li>
            Add the indicator or strategy that produces the signal. If the trigger has Pine code, open the Pine Editor,
            paste the code (it already contains the <code>idWebhook</code>) and <em>Add to chart</em>.
          </li>
          <li>
            Create the alert (clock icon or <kbd>Alt</kbd>+<kbd>A</kbd>). In <em>Condition</em> choose the indicator:
            with <code>alert()</code> in the code use <em>Any alert() function call</em>; with an indicator condition
            choose the condition and write the message by hand.
          </li>
          <li>
            In <em>Notifications</em> check <strong>Webhook URL</strong> and paste:
            <pre className="code-block">{hookUrl}</pre>
          </li>
          <li>
            If you write the message yourself (without <code>alert()</code>), it must be valid JSON:
            <pre className="code-block">{alertMessageExample}</pre>
          </li>
          <li>
            Set the frequency to <strong>once per bar close</strong> so it does not fire on candles that are still
            moving, and a long expiration (or none if your plan allows it).
          </li>
          <li>
            Test it: when the alert fires, the opportunity shows up in <a href="#/">Opportunities</a> as Ongoing (or
            Active if the trigger has no conditions). The <em>Webhook status</em> column of the TradingView alert log
            shows whether the webhook failed.
          </li>
        </ol>
      </More>

      <More title="Pine code example with alert()">
        <p>
          Indicator that warns when the 14-period RSI crosses below 30. The JSON is built inside <code>alert()</code>;{' '}
          <code>{'{{ID_WEBHOOK}}'}</code> is replaced by C-TRD when the code is saved in the trigger.
        </p>
        <pre className="code-block code-block--tall">{pineAlertExample}</pre>
        <p>
          The same idea works to cancel: a second <code>alert()</code> call with <code>idCancel</code> when the signal is
          invalidated (see the Cancel section):
        </p>
        <pre className="code-block code-block--tall">{pineCancelExample}</pre>
        <p className="muted small">
          With a single <em>alert()</em> alert in TradingView both messages arrive: the one that fires and the one that
          cancels.
        </p>
      </More>
    </>
  );
}

// ---------- Otros origenes ----------

const curlExample = `curl -X POST ${hookUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"idWebhook": "<webhook id>", "price": 67250.5, "metadatos": {"origen": "manual"}}'`;

const pythonExample = `import requests

response = requests.post(
    "${hookUrl}",
    json={
        "idWebhook": "<webhook id>",
        "price": 67250.5,
        "metadatos": {"origen": "script", "reason": "range breakout"},
    },
    timeout=10,
)
print(response.status_code, response.json()["message"])`;

const n8nBodyExample = `{
  "idWebhook": "<webhook id>",
  "price": {{ $json.price }},
  "metadatos": { "origen": "n8n", "workflow": "{{ $workflow.name }}" }
}`;

export function OtherSourcesGuide() {
  return (
    <>
      <p>
        The webhook <code>POST {hookUrl}</code> is not exclusive to TradingView: any system that can make a{' '}
        <code>POST</code> with JSON can fire a trigger. It only needs the <code>idWebhook</code> and the{' '}
        <code>price</code>; the rest of the body is the same (metadatos, stop loss, take profit, <code>idCancel</code>).
      </p>
      <div className="help-grid">
        <div className="help-card">
          <h3>n8n, Make or Zapier</h3>
          <p>No-code flows: a starting event (schedule, RSS, Telegram, another API) followed by an HTTP node that calls the webhook.</p>
        </div>
        <div className="help-card">
          <h3>Scripts and bots</h3>
          <p>Python, Node or your own cron that computes its signal (on-chain, news, another exchange) and notifies C-TRD.</p>
        </div>
        <div className="help-card">
          <h3>Manual</h3>
          <p>A <code>curl</code> or Postman call to record your own idea as an opportunity or to test a trigger.</p>
        </div>
      </div>
      <ul className="help-list">
        <li>
          <strong>The sender sets the price</strong>: TradingView takes it from the chart, but n8n or a script has to
          fetch it (e.g. from the exchange API) before calling the webhook.
        </li>
        <li>
          The trigger still needs a <strong>timeframe and max candles</strong>: they define how long the opportunity
          lives (e.g. 4 candles of 1 hour = 4 h), even if the source does not use candles.
        </li>
        <li>
          The webhook does not require a session: <strong>the <code>idWebhook</code> works as a key</strong>. Do not
          publish it; whoever has it can open and cancel opportunities of that trigger.
        </li>
        <li>
          The rules are the same as with TradingView: one live opportunity per trigger, triggers pending approval reject
          alerts, and canceling needs an Ongoing or Active opportunity.
        </li>
      </ul>

      <More title="n8n example: price alert every 15 minutes">
        <ol className="help-list">
          <li>
            <strong>Schedule Trigger</strong>: every 15 minutes.
          </li>
          <li>
            <strong>HTTP Request</strong> (GET) to the asset price, for example{' '}
            <code>https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT</code>. It returns{' '}
            <code>{'{ "symbol": "BTCUSDT", "price": "67250.50" }'}</code>.
          </li>
          <li>
            <strong>IF</strong>: <code>{'{{ Number($json.price) }}'}</code> less than your level (e.g. 60000). Only the
            true branch continues.
          </li>
          <li>
            <strong>HTTP Request</strong> (POST) to <code>{hookUrl}</code>, <em>Body Content Type</em> JSON, with the
            body:
            <pre className="code-block">{n8nBodyExample}</pre>
          </li>
        </ol>
        <p className="muted small">
          If the price stays below the level, later calls do not create new opportunities while one is live: C-TRD
          returns the existing one. To avoid extra calls, store in n8n whether you already sent the alert.
        </p>
      </More>

      <More title="curl and Python examples">
        <pre className="code-block">{curlExample}</pre>
        <pre className="code-block code-block--tall">{pythonExample}</pre>
        <p className="muted small">
          The response is the C-TRD envelope: <code>status</code> SUCCESS or FAIL, <code>message</code> and{' '}
          <code>tracking</code>. A FAIL answers 400 with the reason (unknown trigger, pending approval…).
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
    name: 'Fear below 25',
    callback: 'Fear and Greed below the threshold',
    parameters: 'Threshold: 25',
    interval: '1 hour (3600 s)',
    use: 'Contrarian buys: sentiment is in panic.',
  },
  {
    name: 'Extreme greed',
    callback: 'Fear and Greed: Extreme Greed',
    parameters: '—',
    interval: '1 hour',
    use: 'Take profits or avoid chasing the price.',
  },
  {
    name: 'Altcoins gain dominance',
    callback: 'OTHERS2 dominance above the threshold',
    parameters: 'Threshold (%): 42',
    interval: '4 hours',
    use: 'Buy signals on altcoins when money rotates out of BTC.',
  },
  {
    name: 'Flight to USDT',
    callback: 'USDT dominance above the threshold',
    parameters: 'Threshold (%): 5',
    interval: '1 hour',
    use: 'Filter for sells: the market moves into stablecoins.',
  },
  {
    name: 'Rising liquidity (M2)',
    callback: 'FRED series rising',
    parameters: 'Series M2SL (in the API parameters)',
    interval: '1 day',
    use: 'Bullish macro context for long-term buys. The series is monthly: no need to evaluate it more often.',
  },
  {
    name: 'FED cuts rates',
    callback: 'FED: rate cut likely',
    parameters: '— (fixed 60% threshold)',
    interval: '6 hours',
    use: 'Tailwind for risk assets.',
  },
  {
    name: 'Searches at a high',
    callback: 'Google Trends CSV at a new high',
    parameters: '— (reads the last uploaded CSV)',
    interval: '1 day',
    use: 'Retail euphoria: filter for partial sells.',
  },
  {
    name: 'Extreme hedging in options',
    callback: 'Extreme put/call ratio',
    parameters: '—',
    interval: '1 day',
    use: 'Confirm stock supports with fear or euphoria in options.',
  },
];

export function ConditionExamples() {
  return (
    <More title="Condition examples">
      <p className="muted small">
        Example names and values: adjust the thresholds to your strategy. The real callbacks and their parameters are in
        the Callbacks table (C-TRD names them in Spanish).
      </p>
      <div className="table-wrap">
        <table className="table help-table table--cards table--cards-single">
          <thead>
            <tr>
              <th scope="col">Condition</th>
              <th scope="col">Callback</th>
              <th scope="col">Parameters</th>
              <th scope="col">Interval</th>
              <th scope="col">What for</th>
            </tr>
          </thead>
          <tbody>
            {CONDITION_EXAMPLES.map((example) => (
              <tr key={example.name}>
                <td className="cell--main">
                  <strong>{example.name}</strong>
                </td>
                <td data-label="Callback">{example.callback}</td>
                <td data-label="Parameters">{example.parameters}</td>
                <td data-label="Interval">{example.interval}</td>
                <td data-label="What for">{example.use}</td>
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
    time: 'Monday 08:00',
    text: (
      <>
        Trigger <strong>BTC: capitulation buy</strong>: buy action, 4-hour candles, max 6 candles (24 h). Conditions:{' '}
        <em>Fear below 25</em> (every hour) and <em>FED cuts rates</em> (every 6 hours).
      </>
    ),
  },
  {
    time: 'Monday 12:00',
    text: (
      <>
        A 4 h candle closes with the RSI crossing 30. TradingView calls the webhook with <code>price</code> 61,800. The
        opportunity is born <strong>Ongoing</strong> with a trigger price of 61,800 and expires on Tuesday 12:00.
      </>
    ),
  },
  {
    time: 'Monday 12:01',
    text: (
      <>
        The cronjob copies the status of the conditions: the FED one was already Active, Fear and Greed is at 31
        (Inactive). It stays Ongoing.
      </>
    ),
  },
  {
    time: 'Monday 15:00',
    text: <>Another alert from the same trigger: it does not create a new opportunity, C-TRD answers with the live one.</>,
  },
  {
    time: 'Monday 21:00',
    text: (
      <>
        Fear and Greed drops to 22 and the condition becomes Active. In that minute all of them are Active: the
        opportunity becomes <strong>Active</strong> and stores the activation price (e.g. 60,900).
      </>
    ),
  },
  {
    time: 'Tuesday 12:00',
    text: (
      <>
        It runs out: it becomes <strong>Finished</strong> with the closing price (e.g. 63,400). The next alert opens a new
        opportunity.
      </>
    ),
  },
];

export function WalkthroughGuide() {
  return (
    <>
      <p>A full case, with times in UTC, to see how an opportunity moves:</p>
      <ol className="help-timeline">
        {TIMELINE.map((step) => (
          <li key={step.time}>
            <span className="help-timeline__time">{step.time}</span>
            <span>{step.text}</span>
          </li>
        ))}
      </ol>
      <More title="And if things go differently">
        <ul className="help-list">
          <li>
            If Fear and Greed never drops below 25 before Tuesday 12:00, the opportunity ends up <strong>Expired</strong>
            : the technical signal did not get its context in time.
          </li>
          <li>
            If on Monday 18:00 the price loses the 20-candle low and the alert with <code>idCancel</code> arrives, it ends
            up <strong>Canceled</strong> with the price of that alert as the close, whether it was Ongoing or Active.
          </li>
          <li>
            If Fear and Greed rises to 40 after activation, the opportunity <strong>stays Active</strong>: conditions only
            matter for activating.
          </li>
          <li>
            If the trigger is edited on Monday 14:00, the new version keeps the <code>idWebhook</code>: the 15:00 alert
            opens a new opportunity for the new version, and the previous one goes on but can no longer be canceled with
            the alert.
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
    title: 'Rotation into altcoins',
    source: 'TradingView',
    trigger: 'ETH/BTC breaks resistance on the daily, buy action on ETH, 7 candles of 1 day.',
    conditions: ['OTHERS2 dominance above the threshold (42)', 'BTC dominance below the threshold (55)'],
    idea: 'The technical breakout only counts if money is really leaving BTC for the rest.',
  },
  {
    title: 'Long-term macro accumulation',
    source: 'TradingView',
    trigger: 'BTC price above the 200-week moving average, accumulation action, 4 candles of 1 week.',
    conditions: ['FRED series rising (M2SL)', 'FED: rate cut likely'],
    idea: 'Bullish underlying trend with rising liquidity: staggered buys without watching the short term.',
  },
  {
    title: 'Price alert from n8n',
    source: 'n8n',
    trigger: 'A flow checks the price every 15 minutes and calls the webhook if BTC drops below a level. Buy action, 8 candles of 1 hour.',
    conditions: ['Fear and Greed below the threshold (30)'],
    idea: 'Buy orders by levels without TradingView, filtered by sentiment.',
  },
  {
    title: 'No conditions: signal log',
    source: 'TradingView or script',
    trigger: 'Any signal, watch action, 3 candles of 1 day, no conditions.',
    conditions: [],
    idea: 'The opportunity is born Active with the alert price: useful to measure how a signal performs alone before filtering it.',
  },
];

// ---------- Enlaces y glosario ----------

const LINKS: Array<{ group: string; items: Array<{ href: string; label: string; note: string }> }> = [
  {
    group: 'TradingView',
    items: [
      { href: 'https://www.tradingview.com/support/solutions/43000529348-how-to-configure-webhook-alerts/', label: 'Webhooks', note: 'requirements, ports and format' },
      { href: 'https://www.tradingview.com/pine-script-docs/', label: 'Pine Script manual', note: 'indicators, strategies and alert()' },
      { href: 'https://www.tradingview.com/pine-script-reference/', label: 'Pine Script reference', note: 'every function' },
    ],
  },
  {
    group: 'Automation',
    items: [
      { href: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/', label: 'n8n: HTTP Request node', note: 'call the webhook from a flow' },
      { href: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/', label: 'n8n: Schedule Trigger', note: 'run a flow periodically' },
    ],
  },
  {
    group: 'Condition sources',
    items: [
      { href: 'https://coinmarketcap.com/charts/fear-and-greed-index/', label: 'CoinMarketCap Fear and Greed', note: 'index and dominance' },
      { href: 'https://fred.stlouisfed.org/', label: 'FRED', note: 'macro series (M2SL, rates, employment…)' },
      { href: 'https://polymarket.com/', label: 'Polymarket', note: 'FED probabilities' },
      { href: 'https://trends.google.com/', label: 'Google Trends', note: 'export the interest CSV' },
      { href: 'https://www.alphavantage.co/documentation/', label: 'Alpha Vantage', note: 'stock and options data' },
    ],
  },
];

const GLOSSARY: Array<[string, string]> = [
  ['Asset', 'The instrument being tracked: BTC, ETH, AAPL…'],
  ['Action', 'What the signal suggests doing: buy, sell, accumulate…'],
  ['Timeframe', 'Duration of each candle of the trigger (1 h, 4 h, 1 day…). Together with max candles it defines the expiration.'],
  ['Webhook', 'URL that receives a POST when something happens. In C-TRD it is /hook/trigger.'],
  ['idWebhook', 'Identifier of the trigger for alerts. It is kept when the trigger is edited.'],
  ['Callback', 'C-TRD function that reads the response of an API and answers yes or no.'],
  ['Pine Script', 'TradingView language for indicators, strategies and alerts.'],
  ['Stop loss / take profit', 'Exit levels for loss or profit that the alert can send.'],
  ['UTC', 'Universal time: C-TRD stores everything in UTC and the web shows it in your local time.'],
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
      <h3>Glossary</h3>
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
