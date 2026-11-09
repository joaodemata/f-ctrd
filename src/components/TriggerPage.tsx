import { useState } from 'react';
import { createTrigger } from '../api/triggers';
import { useApiMutation } from '../hooks/useApiMutation';
import { TradingViewHookInfo } from './TradingViewHookInfo';
import { EMPTY_TRIGGER_FORM, TriggerForm } from './TriggerForm';
import { t } from '../i18n/language';

export function TriggerPage() {
  // Cambia al limpiar: remonta el formulario con los valores vacios
  const [formKey, setFormKey] = useState(0);
  const mutation = useApiMutation(createTrigger);

  if (mutation.data) {
    return (
      <main className="page page--narrow">
        <div className="page__head">
          <h1>{t('Trigger creado', 'Trigger created')}</h1>
        </div>
        <section className="panel panel--padded success">
          <p>
            {t('El trigger queda ', 'The trigger is now ')}
            <strong>{t('activo', 'active')}</strong>
            {t(
              '. Cada vez que TradingView llame al webhook se crea una oportunidad (si no hay otra en curso o activa del mismo trigger).',
              '. Every time TradingView calls the webhook an opportunity is created (unless there is already an ongoing or active one for the same trigger).',
            )}
          </p>
          <TradingViewHookInfo idWebhook={mutation.data.idWebhook} />
          <div className="form-actions">
            <button type="button" className="button button--primary" onClick={mutation.reset}>
              {t('Crear otro trigger', 'Create another trigger')}
            </button>
            <a className="button" href="#/triggers">
              {t('Ver triggers', 'See triggers')}
            </a>
            <a className="button" href="#/">
              {t('Ver oportunidades', 'See opportunities')}
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page page--narrow">
      <div className="page__head">
        <div>
          <h1>{t('Nuevo trigger', 'New trigger')}</h1>
          <p className="muted small">
            {t(
              'Un trigger es la senal (por ejemplo una alerta de TradingView) que abre oportunidades sobre un asset.',
              'A trigger is the signal (for example a TradingView alert) that opens opportunities on an asset.',
            )}
          </p>
        </div>
      </div>

      <TriggerForm
        key={formKey}
        initialValues={EMPTY_TRIGGER_FORM}
        withVisibility
        onSubmit={(fields, visibility) => {
          if (visibility) void mutation.run({ ...fields, ...visibility });
        }}
        isPending={mutation.isPending}
        error={mutation.error}
        submitLabel={t('Crear trigger', 'Create trigger')}
        pendingLabel={t('Creando…', 'Creating…')}
        cancelLabel={t('Limpiar', 'Clear')}
        onCancel={() => {
          setFormKey((key) => key + 1);
          mutation.reset();
        }}
      />
    </main>
  );
}
