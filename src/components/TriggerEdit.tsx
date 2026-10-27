import { updateTrigger } from '../api/triggers';
import { useApiMutation } from '../hooks/useApiMutation';
import type { Trigger } from '../models/trigger';
import { TradingViewHookInfo } from './TradingViewHookInfo';
import { TriggerForm, triggerFormValues } from './TriggerForm';

interface TriggerEditProps {
  trigger: Trigger;
  // Vuelve al listado; `updated` indica si hay que refrescarlo
  onClose: (updated: boolean) => void;
}

// Formulario de PUT /operation/update/trigger con los datos actuales del trigger
export function TriggerEdit({ trigger, onClose }: TriggerEditProps) {
  const mutation = useApiMutation(updateTrigger);

  if (mutation.data) {
    return (
      <section className="panel panel--padded success">
        <p>
          Se creo una nueva version <strong>activa</strong> del trigger y la anterior quedo <strong>inactiva</strong>.
          La version nueva tiene otro ID, pero conserva el <strong>ID del webhook</strong>: la alerta de TradingView no
          cambia y ahora la recibe la version nueva.
        </p>
        <TradingViewHookInfo idWebhook={mutation.data.idWebhook} />
        <dl className="kv kv--wide">
          <dt>ID nuevo</dt>
          <dd>
            <code>{mutation.data.idTrigger}</code>
          </dd>
          <dt>ID anterior</dt>
          <dd>
            <code>{mutation.data.idPreviousTrigger}</code>
          </dd>
        </dl>
        <div className="form-actions">
          <button type="button" className="button button--primary" onClick={() => onClose(true)}>
            Volver a los triggers
          </button>
        </div>
      </section>
    );
  }

  return (
    <TriggerForm
      initialValues={triggerFormValues(trigger)}
      onSubmit={(body) => void mutation.run({ ...body, idTrigger: trigger.id })}
      isPending={mutation.isPending}
      error={mutation.error}
      submitLabel="Guardar cambios"
      pendingLabel="Guardando…"
      cancelLabel="Cancelar"
      onCancel={() => onClose(false)}
      notice={
        <p className="notice">
          Al guardar, C-TRD crea una nueva version del trigger con <strong>otro ID</strong> y deja inactiva la actual:
          la alerta de TradingView debe pasar a usar el ID nuevo.
        </p>
      }
    />
  );
}
