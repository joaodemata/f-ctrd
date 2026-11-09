import { t, type Localized } from '../i18n/language';
import { AGENT_RUN_STATUSES, AGENT_THESIS_STATUSES } from '../models/agent';
import { OPPORTUNITY_STATUSES } from '../models/opportunity';

// Estados genericos de condiciones y triggers (GENERIC_STATUS en common/constants.go)
const GENERIC_STATUS_LABELS: Readonly<Record<string, Localized>> = {
  'STATUS-ACTIVE': { es: 'Activo', en: 'Active' },
  'STATUS-INACTIVE': { es: 'Inactivo', en: 'Inactive' },
  'STATUS-DELETED': { es: 'Eliminado', en: 'Deleted' },
  'STATUS-PENDING-FOR-APPROVE': { es: 'Pendiente de aprobacion', en: 'Pending approval' },
  'STATUS-NOT-APPROVED': { es: 'No aprobado', en: 'Not approved' },
};

function knownStatus(tag: string): Localized | undefined {
  return (
    OPPORTUNITY_STATUSES.find((item) => item.tag === tag)?.label ??
    AGENT_THESIS_STATUSES.find((item) => item.tag === tag)?.label ??
    AGENT_RUN_STATUSES.find((item) => item.tag === tag)?.label ??
    GENERIC_STATUS_LABELS[tag]
  );
}

// Badge de estado; el color sale del tag (data-status) en styles.css. En espanol se muestra el nombre que manda C-TRD;
// en ingles se traduce por tag, y un tag desconocido queda con el nombre de C-TRD
export function StatusBadge({ tag, label }: { tag: string; label: string }) {
  const known = knownStatus(tag);
  return (
    <span className="status-badge" data-status={tag}>
      {known ? t(label, known.en) : label}
    </span>
  );
}
