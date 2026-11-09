import { useState } from 'react';
import { ReviewDecision } from '../models/agent';
import { t } from '../i18n/language';

interface ReviewButtonsProps {
  onDecision: (decision: ReviewDecision) => void;
  // Decision en curso para este registro, null si no hay ninguna
  pendingDecision: ReviewDecision | null;
  // Deshabilita los botones mientras se revisa otro registro
  disabled?: boolean;
  // Que implica aprobar (ej: un trigger aprueba sus condiciones)
  approveHint?: string;
}

// Aprobar o rechazar algo que creo un agente. Rechazar no se puede deshacer (queda No aprobado), por eso pide
// confirmacion en linea; no se usa window.confirm
export function ReviewButtons({ onDecision, pendingDecision, disabled = false, approveHint }: ReviewButtonsProps) {
  const [confirmingReject, setConfirmingReject] = useState(false);
  const busy = disabled || pendingDecision !== null;

  if (confirmingReject) {
    return (
      <span className="review-buttons" role="group" aria-label={t('Confirmar rechazo', 'Confirm rejection')}>
        <span className="small">{t('Rechazar no se puede deshacer.', 'Rejecting cannot be undone.')}</span>
        <button
          type="button"
          className="button button--danger"
          onClick={() => {
            setConfirmingReject(false);
            onDecision(ReviewDecision.Reject);
          }}
          disabled={busy}
        >
          {t('Confirmar rechazo', 'Confirm rejection')}
        </button>
        <button type="button" className="button button--ghost" onClick={() => setConfirmingReject(false)}>
          {t('Cancelar', 'Cancel')}
        </button>
      </span>
    );
  }

  return (
    <span className="review-buttons" role="group" aria-label={t('Revision', 'Review')}>
      <button
        type="button"
        className="button button--primary"
        onClick={() => onDecision(ReviewDecision.Approve)}
        disabled={busy}
        title={approveHint}
      >
        {pendingDecision === ReviewDecision.Approve ? t('Aprobando…', 'Approving…') : t('Aprobar', 'Approve')}
      </button>
      <button type="button" className="button" onClick={() => setConfirmingReject(true)} disabled={busy}>
        {pendingDecision === ReviewDecision.Reject ? t('Rechazando…', 'Rejecting…') : t('Rechazar', 'Reject')}
      </button>
    </span>
  );
}
