import { apiBaseUrl } from '../api/config';
import { OpportunityStatusTag } from '../models/opportunity';
import {
  ConditionExamples,
  LinksGuide,
  MORE_TRIGGER_EXAMPLES,
  OtherSourcesGuide,
  TradingViewGuide,
  WalkthroughGuide,
} from './HelpGuideEn';
import { More } from './HelpGuide';
import {
  CallbackCatalog,
  CancelReasonCatalog,
  LifecycleDiagram,
  Recipe,
  Section,
  SectionLink,
  cancelBodyExample,
  hookBodyExample,
} from './HelpShared';
import { StatusBadge } from './StatusBadge';

// Cuerpo de la ayuda en ingles: traduccion de HelpContentEs.tsx con la misma estructura y los mismos ids de seccion.
// Al cambiar el comportamiento de C-TRD hay que actualizar los dos
export function HelpContentEn() {
  return (
    <>
      <Section id="ayuda-resumen" title="How it all fits together">
        <ol className="help-pipeline">
          <li>
            <strong>Trigger</strong>
            <span>
              The technical signal: an alert from TradingView (or n8n, a script…) on an asset, with an action (buy,
              sell…).
            </span>
          </li>
          <li>
            <strong>Opportunity</strong>
            <span>Each alert of the trigger opens an opportunity, which copies the trigger's data and its conditions.</span>
          </li>
          <li>
            <strong>Conditions</strong>
            <span>The context: they query an API every so often and end up Active or Inactive.</span>
          </li>
          <li>
            <strong>Callback</strong>
            <span>The function that reads the API response and decides whether the condition is met (yes or no).</span>
          </li>
        </ol>
        <p>
          The idea: the trigger says <em>when to look</em> (price and technical analysis) and the conditions say{' '}
          <em>whether the context agrees</em> (macro, sentiment, interest, options…). An opportunity only becomes{' '}
          <strong>Active</strong> when both line up before time runs out, and it closes by itself when it runs out (
          <strong>Finished</strong>) or earlier with a cancel alert (<strong>Canceled</strong>).
        </p>
      </Section>

      <Section id="ayuda-ciclo" title="Life cycle of an opportunity">
        <LifecycleDiagram />

        <div className="table-wrap">
          <table className="table help-table table--cards table--cards-single">
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col">When it enters</th>
                <th scope="col">Price it stores</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="cell--main">
                  <StatusBadge tag={OpportunityStatusTag.Ongoing} label="En Curso" />
                </td>
                <td data-label="When it enters">
                  The alert arrives and the trigger has conditions. The expiration period starts running at that moment.
                </td>
                <td data-label="Price it stores">
                  <strong>Trigger</strong>: the <code>price</code> sent by TradingView.
                </td>
              </tr>
              <tr>
                <td className="cell--main">
                  <StatusBadge tag={OpportunityStatusTag.Active} label="Activa" />
                </td>
                <td data-label="When it enters">
                  In a cronjob cycle all its conditions are Active and it has not run out yet. If the trigger has no
                  conditions, the opportunity is born Active right away.
                </td>
                <td data-label="Price it stores">
                  <strong>Activation</strong>: market price of the asset when it is activated (empty if it could not be
                  fetched). Without conditions, the same price as the alert.
                </td>
              </tr>
              <tr>
                <td className="cell--main">
                  <StatusBadge tag={OpportunityStatusTag.Expired} label="Expirada" />
                </td>
                <td data-label="When it enters">
                  It was still Ongoing when its expiration date passed: the conditions were not met in time. It is a final
                  state.
                </td>
                <td data-label="Price it stores">—</td>
              </tr>
              <tr>
                <td className="cell--main">
                  <StatusBadge tag={OpportunityStatusTag.Finished} label="Finalizada" />
                </td>
                <td data-label="When it enters">
                  It was still Active when its expiration date passed (cronjob, every minute). It is a final state.
                </td>
                <td data-label="Price it stores">
                  <strong>Close</strong>: market price of the asset when it finishes (empty if it could not be fetched).
                </td>
              </tr>
              <tr>
                <td className="cell--main">
                  <StatusBadge tag={OpportunityStatusTag.Canceled} label="Cancelada" />
                </td>
                <td data-label="When it enters">
                  An alert from the trigger arrives with <code>idCancel</code> while the opportunity is Ongoing or Active.
                  It also stores the reason. It is a final state (see <SectionLink id="ayuda-cancelar">Cancel</SectionLink>
                  ).
                </td>
                <td data-label="Price it stores">
                  <strong>Close</strong>: the <code>price</code> sent by TradingView in the cancel alert.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Rules worth remembering</h3>
        <ul className="help-list">
          <li>
            The cronjob runs <strong>every minute</strong>: it evaluates the conditions that are due, copies their status
            to the Ongoing opportunities, activates the ones that are all green, expires the Ongoing ones that ran out
            and finishes the Active ones that ran out.
          </li>
          <li>
            <strong>Expiration = max candles × candle duration of the trigger</strong>, counted from the alert. E.g. 5
            candles of 4 hours = 20 h. It is both the deadline for the conditions to be met and the maximum life of the
            opportunity: it is not extended on activation, so one that activates late stays Active for less time.
          </li>
          <li>
            There is only <strong>one live opportunity per trigger</strong>: if it already has an Ongoing or Active one,
            a new alert does not create another (C-TRD answers with the id of the existing one). Once it closes
            (Expired, Finished or Canceled), the next alert opens a new one.
          </li>
          <li>
            An Active opportunity <strong>does not go back</strong> even if a condition is deactivated later: it stays
            Active until it runs out (Finished) or is canceled.
          </li>
          <li>
            The opportunity stores a <strong>copy</strong> of the trigger's data when it is born: editing the trigger does
            not change existing opportunities. What does get updated is the status of their conditions.
          </li>
          <li>All prices are in USD and dates are stored in UTC (shown here in your local time).</li>
        </ul>
      </Section>

      <Section id="ayuda-triggers" title="Triggers and TradingView alerts">
        <p>
          A trigger defines the asset, the action, the candle timeframe, the max candles and, optionally, a list of
          conditions. For it to work you need an alert in TradingView (see{' '}
          <SectionLink id="ayuda-tradingview">TradingView</SectionLink>) or another system (see{' '}
          <SectionLink id="ayuda-origenes">n8n and other sources</SectionLink>) that calls the webhook:
        </p>
        <dl className="kv kv--wide">
          <dt>Webhook</dt>
          <dd>
            <code>POST {apiBaseUrl}/hook/trigger</code>
          </dd>
          <dt>Message</dt>
          <dd>
            <pre className="code-block">{hookBodyExample()}</pre>
          </dd>
        </dl>
        <ul className="help-list">
          <li>
            <code>idWebhook</code> and <code>price</code> (greater than 0) are required. The <code>idWebhook</code> is
            shown when the trigger is created or edited (it does not appear in the list). <code>metadatos</code> is a free
            object stored in the opportunity.
          </li>
          <li>
            <code>stopLoss</code> and <code>takeProfit</code> are optional: lists of targets with <code>price</code>{' '}
            (greater than 0) and an optional <code>probability</code>. They are only stored when the alert creates the
            opportunity; if one was already live, they are ignored.
          </li>
          <li>
            <strong>Editing a trigger creates a new version with a different id</strong> and inactivates the previous
            one, but keeps the <code>idWebhook</code>: the alert does not change and C-TRD assigns it to the current
            version. The history is in <a href="#/triggers">Triggers</a> → details → <em>Show version details</em>.
          </li>
          <li>
            The one-live-opportunity rule is per id: the new version can open an opportunity even if the previous version
            has an Ongoing one.
          </li>
          <li>
            The trigger can store its <strong>Pine code</strong>. On save, <code>{'{{ID_WEBHOOK}}'}</code> is replaced
            with the trigger's <code>idWebhook</code>, so the code already carries the message ready for the alert. When
            editing, an empty code keeps the previous one.
          </li>
        </ul>
      </Section>

      <Section id="ayuda-tradingview" title="What TradingView is and how to connect it">
        <TradingViewGuide />
      </Section>

      <Section id="ayuda-origenes" title="Other sources: n8n, scripts and manual alerts">
        <OtherSourcesGuide />
      </Section>

      <Section id="ayuda-visibilidad" title="Users and visibility">
        <p>
          Logging in is optional. Only the <strong>super user</strong> creates and edits triggers, creates conditions and
          uploads Google Trends CSVs. Each trigger and condition stores the user who created it and a{' '}
          <strong>visibility</strong> that decides who sees its opportunities:
        </p>
        <dl className="kv kv--wide">
          <dt>Private</dt>
          <dd>Only the user who created it.</dd>
          <dt>Public</dt>
          <dd>Everyone, including visitors without a session.</dd>
          <dt>Private list</dt>
          <dd>The user who created it and the users on the list (ids of active users).</dd>
        </dl>
        <ul className="help-list">
          <li>
            Without a session, <a href="#/">Opportunities</a> only shows public ones. With a session it also shows yours
            and those of private lists you are on. The totals by status only count the ones you can see.
          </li>
          <li>
            The opportunity copies the user and visibility of the trigger when it is born. The visibility is chosen when
            the trigger is created; editing it creates a new version with the same user and visibility.
          </li>
          <li>
            Triggers and opportunities created before users existed have no visibility: nobody sees those opportunities,
            nor the new ones from those triggers.
          </li>
          <li>
            Today only opportunities are filtered by visibility; the trigger and condition lists are not. Conditions are
            filtered by status: without a session or privilege you only see Active and Inactive ones; those pending
            approval and those not approved are only visible to the super user.
          </li>
        </ul>
      </Section>

      <Section id="ayuda-cancelar" title="Cancel an opportunity">
        <p>
          An Ongoing or Active opportunity is canceled with another TradingView alert to the same webhook, with the
          trigger's webhook id and a <strong>cancel reason</strong> in <code>idCancel</code>. It is useful, for example,
          for an alert that invalidates the signal (a level is lost, an opposite cross…).
        </p>
        <dl className="kv kv--wide">
          <dt>Webhook</dt>
          <dd>
            <code>POST {apiBaseUrl}/hook/trigger</code>
          </dd>
          <dt>Message</dt>
          <dd>
            <pre className="code-block">{cancelBodyExample()}</pre>
          </dd>
        </dl>
        <ul className="help-list">
          <li>
            The opportunity becomes <strong>Canceled</strong> immediately and stores the <code>price</code> as the
            closing price, plus the reason, which is shown in the opportunity details.
          </li>
          <li>
            With <code>idCancel</code> the alert never creates an opportunity: if the trigger has no Ongoing or Active
            one, C-TRD rejects the alert.
          </li>
          <li>
            It cancels the live opportunity <strong>of the current version</strong> of the trigger: an opportunity opened
            by a previous version (before editing it) can no longer be canceled with the alert.
          </li>
        </ul>
        <h3>Available cancel reasons</h3>
        <CancelReasonCatalog />
      </Section>

      <Section id="ayuda-condiciones" title="What a condition is">
        <p>A condition is a question about the market context that C-TRD asks periodically. It is made of:</p>
        <ul className="help-list">
          <li>
            <strong>An API</strong> from a provider (FRED, Polymarket, Alpha Vantage, Google Trends…) with its parameters
            (series, market, asset…).
          </li>
          <li>
            <strong>A callback</strong> that reads the response and answers yes or no. Some callbacks accept{' '}
            <strong>parameters</strong> (e.g. a threshold) that are set when the condition is created; if they are not
            sent, their default value is used.
          </li>
          <li>
            <strong>An interval</strong> (minimum 60 s): how often the question is asked again.
          </li>
          <li>
            <strong>A unique tag, a name and a type</strong> (catalog of condition types: macro, monetary policy,
            sentiment…) to identify and classify it.
          </li>
        </ul>
        <p>How it behaves:</p>
        <ul className="help-list">
          <li>
            It is born <strong>Inactive</strong>. In each evaluation it becomes <strong>Active</strong> if the callback
            says yes and <strong>Inactive</strong> if it says no.
          </li>
          <li>
            It is a <strong>state, not an event</strong>: it can go from Active to Inactive and back. If it is already
            Active when the alert arrives, the opportunity copies it as Active and can activate in the next minute.
          </li>
          <li>
            If the API fails or the callback errors, <strong>the status does not change</strong> and it is retried in the
            next interval. The last evaluation is shown in <a href="#/condiciones">Conditions</a>.
          </li>
          <li>
            It is <strong>shared</strong>: the same condition can be in many triggers and it is evaluated only once for
            all of them.
          </li>
        </ul>
        <ConditionExamples />
      </Section>

      <Section id="ayuda-callbacks" title="Callbacks: how they relate to conditions">
        <ol className="help-pipeline">
          <li>
            <strong>API</strong>
            <span>Makes the request with the condition's parameters.</span>
          </li>
          <li>
            <strong>Response format</strong>
            <span>Each API declares the shape of its response (e.g. FRED_SERIES_OBSERVATIONS).</span>
          </li>
          <li>
            <strong>Callback</strong>
            <span>Only callbacks that can read that format can be chosen for that API.</span>
          </li>
          <li>
            <strong>Yes / No</strong>
            <span>Sets the condition to Active or Inactive.</span>
          </li>
        </ol>
        <ul className="help-list">
          <li>
            The same API serves several conditions with <strong>different callbacks</strong>: the FRED series can be used
            for "rising" or "falling", and with different parameters (another series).
          </li>
          <li>
            Some callbacks have <strong>parameters</strong> set on each condition: the Fear and Greed and dominance
            threshold ones (BTC, USDT, OTHERS2, OTHERS3) take the threshold, with its range validated on creation. So
            "Fear and Greed below 25" and "below 15" are two conditions with the same callback.
          </li>
          <li>
            The others have a fixed threshold (e.g. Polymarket 60% or more, Fear and Greed bands). A different fixed
            threshold or new logic requires adding a callback in C-TRD.
          </li>
        </ul>
        <h3>Available callbacks by API</h3>
        <CallbackCatalog />
      </Section>

      <Section id="ayuda-senales" title="How to combine conditions for complex signals">
        <div className="help-grid">
          <div className="help-card">
            <h3>AND (all)</h3>
            <p>
              It is the native behavior: a trigger with several conditions only activates when <strong>all</strong> of
              them are Active at the same time. Each condition you add filters out more signals.
            </p>
          </div>
          <div className="help-card">
            <h3>OR (any)</h3>
            <p>
              Create <strong>several triggers</strong> with the same asset and action but different conditions, each with
              its own TradingView alert. The one that finds its context first activates.
            </p>
          </div>
          <div className="help-card">
            <h3>NOT (negation)</h3>
            <p>
              Use the <strong>opposite callback</strong>: low zone instead of high, falling instead of rising. Careful:
              they do not always cover everything (for the FED no option may reach 60%).
            </p>
          </div>
          <div className="help-card">
            <h3>Ranges</h3>
            <p>
              Fear and Greed has bands that do not overlap. "Fear or extreme fear" is an OR: two triggers, one with each
              band.
            </p>
          </div>
          <div className="help-card">
            <h3>Time window</h3>
            <p>
              The max candles is the time you give the context to line up after the alert. Few candles = immediate
              confirmation; many = waiting for the context to agree.
            </p>
          </div>
          <div className="help-card">
            <h3>Interval vs window</h3>
            <p>
              The condition interval should be well below the trigger window, and consistent with how often the data
              changes: a monthly FRED series does not need to be evaluated every minute.
            </p>
          </div>
        </div>
        <p className="muted small">
          The same strategy on several timeframes = one trigger per timeframe, reusing the same conditions.
        </p>
      </Section>

      <Section id="ayuda-recetas" title="Signal examples">
        <p className="muted small">
          They use callbacks that exist in C-TRD; each one needs its API to be configured (see the catalog above).
        </p>
        <div className="help-grid">
          <Recipe
            title="Buy on capitulation"
            trigger="Oversold RSI on the daily (TradingView), buy/accumulate action, 5 candles of 1 day."
            conditions={['Fear and Greed: Extreme Fear', 'FED: rate cut likely']}
            idea="Panic in sentiment while the market prices in favorable liquidity."
          />
          <Recipe
            title="Short on shrinking liquidity"
            trigger="Loss of support on BTC, sell action, 3 candles of 1 day."
            conditions={['FED: rate hike likely', 'FRED series falling (e.g. M2)', 'Stablecoin dominance above 12%']}
            idea="Money leaves risk: rising rates, less liquidity and refuge in stablecoins."
          />
          <Recipe
            title="Retail euphoria: distribute"
            trigger="Range high on 4 hours, partial sell action, 6 candles of 4 hours."
            conditions={['Google Trends CSV at a new high', 'Fear and Greed: Extreme Greed']}
            idea="When everybody searches for the asset and sentiment is at its limit, the risk becomes asymmetric."
          />
          <Recipe
            title="Bounce with options hedging"
            trigger="Bounce on the support of a stock (e.g. AAPL), buy action, 4 candles of 1 day."
            conditions={['Extreme put/call ratio']}
            idea="An extreme put/call usually marks excess hedging or euphoria: it confirms the support is relevant."
          />
        </div>
        <More title="More examples (thresholds, macro, n8n and no conditions)">
          <div className="help-grid">
            {MORE_TRIGGER_EXAMPLES.map((example) => (
              <Recipe key={example.title} {...example} />
            ))}
          </div>
        </More>
      </Section>

      <Section id="ayuda-recorrido" title="A full case, minute by minute">
        <WalkthroughGuide />
      </Section>

      <Section id="ayuda-agentes" title="AI agents">
        <p>
          The agents turn investment ideas into conditions and a trigger with its Pine code. Everything they create stays{' '}
          <strong>Pending approval</strong> until the super user reviews it.
        </p>
        <ol className="help-list">
          <li>
            In <a href="#/agentes/tesis">Agent theses</a> you add a thesis (asset, action and an idea in free text). The
            theses form a queue: oldest first. Only pending ones can be deleted.
          </li>
          <li>
            Every Friday night a run takes the 5 oldest pending theses; the rest wait for the next week. The agents
            (Condition Designer, Trigger Composer and Pine Author) design the conditions, the trigger and the code, and
            C-TRD validates each output. If Claude is not available, the thesis goes back to the queue.
          </li>
          <li>
            In <a href="#/agentes/corridas">Agent runs</a> you see each attempt of each agent, the problems found and
            which conditions and trigger were created. A run can end Successful, Failed or with <em>Needs input</em> if
            the thesis was not enough to design the signal.
          </li>
          <li>
            In <a href="#/agentes/revision">Agent review</a> you approve or reject. While they are pending, the cronjob
            does not evaluate those conditions and the webhook rejects those triggers.
          </li>
        </ol>
        <ul className="help-list">
          <li>
            <strong>Approving a trigger</strong> makes it Active and approves its pending conditions, which become
            Inactive and start being evaluated. Then create the TradingView alert with the trigger's Pine code.
          </li>
          <li>
            <strong>Rejecting</strong> cannot be undone: it stays <em>Not approved</em>, it is not deleted, and no
            rejected condition can be used in a new or approved trigger. A condition used by a trigger can only be
            rejected after the trigger is rejected.
          </li>
          <li>
            Editing a pending trigger from <a href="#/triggers">Triggers</a> does not apply: that list only shows active
            ones. If it needs fixing, approve it and edit it afterwards, or reject it.
          </li>
        </ul>
      </Section>

      <Section id="ayuda-problemas" title="Common problems">
        <dl className="help-faq">
          <dt>The alert arrives but no new opportunity shows up</dt>
          <dd>
            The trigger already has an Ongoing or Active opportunity: C-TRD returns that one. If the error is "El trigger
            enviado no existe" (the trigger does not exist), the trigger was edited and the alert still uses the old id.
            If the opportunity was created but you cannot see it, check the trigger's{' '}
            <SectionLink id="ayuda-visibilidad">visibility</SectionLink> and which user you logged in with.
          </dd>
          <dt>The alert answers "El trigger esta pendiente de aprobacion" or "no fue aprobado"</dt>
          <dd>
            The trigger was created by an agent and is pending approval or was not approved. Approve it in{' '}
            <a href="#/agentes/revision">Agent review</a>; a rejected one never receives alerts again.
          </dd>
          <dt>The opportunity does not become Active</dt>
          <dd>
            Check the status and last evaluation of each one in <a href="#/condiciones">Conditions</a>. If the API fails,
            the status does not change. If the window ran out, it ends up Expired even if they are met later.
          </dd>
          <dt>The Active opportunity has no activation price, or the Finished one has no closing price</dt>
          <dd>
            The market price of the asset could not be fetched in that cycle; activation and closing are not blocked by
            that.
          </dd>
          <dt>The cancel alert is rejected</dt>
          <dd>
            "La razon de cancelacion enviada no existe" (the cancel reason does not exist): the <code>idCancel</code> is
            not one of the reasons in <SectionLink id="ayuda-cancelar">Cancel</SectionLink>. "El trigger no tiene una
            oportunidad en curso o activa para cancelar" (nothing to cancel): it already closed (ran out or was canceled
            before) or the alert uses the id of an old version of the trigger.
          </dd>
          <dt>TradingView fires the alert but C-TRD receives nothing</dt>
          <dd>
            Check the <em>Webhook status</em> column of the alert log. The URL must be the public one of the environment
            (https, port 80 or 443; <code>localhost</code> does not work), the account needs a plan with webhooks and 2FA
            enabled, and the message must be valid JSON (watch quotes and commas when editing it by hand).
          </dd>
          <dt>The Google Trends condition does not change</dt>
          <dd>
            It reads the last CSV uploaded for the asset. Upload a new one in <a href="#/google-trends">Google Trends</a>{' '}
            to update the series.
          </dd>
          <dt>Tracking codes</dt>
          <dd>
            Every error shows a code. Those starting with <code>F</code> come from the frontend (network, timeout…); the
            rest come from C-TRD and help find the origin in its logs. Messages from C-TRD are in Spanish.
          </dd>
        </dl>
      </Section>

      <Section id="ayuda-enlaces" title="Useful links and glossary">
        <LinksGuide />
      </Section>
    </>
  );
}
