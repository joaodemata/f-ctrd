// Badge de estado; el color sale del tag (data-status) en styles.css
export function StatusBadge({ tag, label }: { tag: string; label: string }) {
  return (
    <span className="status-badge" data-status={tag}>
      {label}
    </span>
  );
}
