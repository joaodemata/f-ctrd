import { updateTrigger } from '../api/triggers';
import { useApiMutation } from '../hooks/useApiMutation';
import type { Trigger } from '../models/trigger';
import { visibilityLabel } from '../models/visibility';
import { TradingViewHookInfo } from './TradingViewHookInfo';
import { TriggerForm, triggerFormValues } from './TriggerForm';
import { t } from '../i18n/language';

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
          {t('Se creo una nueva version ', 'A new ')}
          <strong>{t('activa', 'active')}</strong>
          {t(' del trigger y la anterior quedo ', ' version of the trigger was created and the previous one is now ')}
          <strong>{t('inactiva', 'inactive')}</strong>
          {t(
            '. La version nueva tiene otro ID, pero conserva el ',
            '. The new version has a different ID, but keeps the ',
          )}
          <strong>{t('ID del webhook', 'webhook ID')}</strong>
          {t(
            ': la alerta de TradingView no cambia y ahora la recibe la version nueva.',
            ': the TradingView alert does not change and the new version receives it now.',
          )}
        </p>
        <TradingViewHookInfo idWebhook={mutation.data.idWebhook} />
        <dl className="kv kv--wide">
          <dt>{t('ID nuevo', 'New ID')}</dt>
          <dd>
            <code>{mutation.data.idTrigger}</code>
          </dd>
          <dt>{t('ID anterior', 'Previous ID')}</dt>
          <dd>
            <code>{mutation.data.idPreviousTrigger}</code>
          </dd>
        </dl>
        <div className="form-actions">
          <button type="button" className="button button--primary" onClick={() => onClose(true)}>
            {t('Volver a los triggers', 'Back to triggers')}
          </button>
        </div>
      </section>
    );
  }

  return (
    <TriggerForm
      initialValues={triggerFormValues(trigger)}
      onSubmit={(fields) => void mutation.run({ ...fields, idTrigger: trigger.id })}
      isPending={mutation.isPending}
      error={mutation.error}
      submitLabel={t('Guardar cambios', 'Save changes')}
      pendingLabel={t('Guardando…', 'Saving…')}
      cancelLabel={t('Cancelar', 'Cancel')}
      onCancel={() => onClose(false)}
      codeHint={t('Vacio conserva el codigo actual.', 'Leave empty to keep the current code.')}
      notice={
        <p className="notice">
          {t('Al guardar, C-TRD crea una nueva version del trigger con ', 'On save, C-TRD creates a new version of the trigger with ')}
          <strong>{t('otro ID', 'a different ID')}</strong>
          {t(
            ' y deja inactiva la actual. La version nueva conserva el ID del webhook, el usuario y la visibilidad, que no se pueden cambiar aqui (visibilidad actual: ',
            ' and inactivates the current one. The new version keeps the webhook ID, the user and the visibility, which cannot be changed here (current visibility: ',
          )}
          <strong>{visibilityLabel(trigger)}</strong>).
        </p>
      }
    />
  );
}
