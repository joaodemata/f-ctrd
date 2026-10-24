import { OPPORTUNITY_STATUSES, type OpportunityStatusInfo } from '../models/opportunity';

interface StatusSummaryProps {
  counts: Partial<Record<string, number>> | undefined;
  total: number | undefined;
  selected: string | null;
  onSelect: (status: OpportunityStatusInfo | null) => void;
}

// Tarjetas con el total por estado; al hacer click filtran el listado por ese estado
export function StatusSummary({ counts, total, selected, onSelect }: StatusSummaryProps) {
  return (
    <section className="summary" aria-label="Resumen por estado">
      <button
        type="button"
        className="summary__card"
        aria-pressed={selected === null}
        onClick={() => onSelect(null)}
      >
        <span className="summary__label">Todas</span>
        <span className="summary__value">{total ?? '…'}</span>
      </button>
      {OPPORTUNITY_STATUSES.map((status) => (
        <button
          key={status.tag}
          type="button"
          className="summary__card"
          data-status={status.tag}
          aria-pressed={selected === status.tag}
          onClick={() => onSelect(selected === status.tag ? null : status)}
        >
          <span className="summary__label">{status.name}</span>
          <span className="summary__value">{counts?.[status.tag] ?? '…'}</span>
        </button>
      ))}
    </section>
  );
}
