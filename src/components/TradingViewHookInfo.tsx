import { apiBaseUrl } from '../api/config';
import { CopyButton } from './CopyButton';

// Datos para configurar la alerta de TradingView de un trigger (POST /hook/trading_view con el idWebhook).
// C-TRD solo envia el idWebhook al crear o actualizar el trigger, los listados no lo incluyen
export function TradingViewHookInfo({ idWebhook }: { idWebhook: string }) {
  const hookBody = JSON.stringify({ idWebhook });
  return (
    <dl className="kv kv--wide">
      <dt>ID del webhook</dt>
      <dd className="copy-row">
        <code>{idWebhook}</code>
        <CopyButton text={idWebhook} />
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
