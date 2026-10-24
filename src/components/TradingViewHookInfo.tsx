import { apiBaseUrl } from '../api/config';
import { CopyButton } from './CopyButton';

// Datos para configurar la alerta de TradingView de un trigger (POST /hook/trading_view con el idTrigger)
export function TradingViewHookInfo({ idTrigger }: { idTrigger: string }) {
  const hookBody = JSON.stringify({ idTrigger });
  return (
    <dl className="kv kv--wide">
      <dt>ID del trigger</dt>
      <dd className="copy-row">
        <code>{idTrigger}</code>
        <CopyButton text={idTrigger} />
      </dd>
      <dt>Webhook</dt>
      <dd className="copy-row">
        <code>POST {apiBaseUrl}/hook/trading_view</code>
      </dd>
      <dt>Body de la alerta</dt>
      <dd className="copy-row">
        <code>{hookBody}</code>
        <CopyButton text={hookBody} />
      </dd>
    </dl>
  );
}
