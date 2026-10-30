import { useState } from 'react';
import { createTrigger } from '../api/triggers';
import { useApiMutation } from '../hooks/useApiMutation';
import { TradingViewHookInfo } from './TradingViewHookInfo';
import { EMPTY_TRIGGER_FORM, TriggerForm } from './TriggerForm';

export function TriggerPage() {
  // Cambia al limpiar: remonta el formulario con los valores vacios
  const [formKey, setFormKey] = useState(0);
  const mutation = useApiMutation(createTrigger);

  if (mutation.data) {
    return (
      <main className="page page--narrow">
        <div className="page__head">
          <h1>Trigger creado</h1>
        </div>
        <section className="panel panel--padded success">
          <p>
            El trigger queda <strong>activo</strong>. Cada vez que TradingView llame al webhook se crea una oportunidad
            (si no hay otra en curso o activa del mismo trigger).
          </p>
          <TradingViewHookInfo idWebhook={mutation.data.idWebhook} />
          <div className="form-actions">
            <button type="button" className="button button--primary" onClick={mutation.reset}>
              Crear otro trigger
            </button>
            <a className="button" href="#/triggers">
              Ver triggers
            </a>
            <a className="button" href="#/">
              Ver oportunidades
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
          <h1>Nuevo trigger</h1>
          <p className="muted small">
            Un trigger es la senal (por ejemplo una alerta de TradingView) que abre oportunidades sobre un asset.
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
        submitLabel="Crear trigger"
        pendingLabel="Creando…"
        cancelLabel="Limpiar"
        onCancel={() => {
          setFormKey((key) => key + 1);
          mutation.reset();
        }}
      />
    </main>
  );
}
