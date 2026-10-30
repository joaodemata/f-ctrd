import { useAuth } from '../hooks/useAuth';
import { hasOwner, isOwnedBy, type RecordOwner } from '../models/user';
import { VISIBILITY, hasVisibility, visibilityLabel, type RecordVisibility } from '../models/visibility';

interface RecordAccessProps {
  record: RecordOwner & RecordVisibility;
}

// Usuario que creo el registro y quienes lo pueden ver, dentro de un panel de detalle
export function RecordAccess({ record }: RecordAccessProps) {
  const { user } = useAuth();
  const allowedUsers = record.allowedUsers ?? [];
  const isWhitelist = record.tagTypeVisibility === VISIBILITY.whitelist.tag;

  return (
    <div>
      <h4>Usuario y visibilidad</h4>
      <dl className="kv">
        <dt>Visibilidad</dt>
        <dd title={record.descriptionTypeVisibility || undefined}>
          {visibilityLabel(record)}
          {!hasVisibility(record) && <span className="muted"> · anterior a la visibilidad</span>}
        </dd>
        {isWhitelist && (
          <>
            <dt>Lista</dt>
            <dd>
              {allowedUsers.length === 0
                ? '—'
                : allowedUsers.map((id) => (
                    <code key={id} className="small record-access__user">
                      {id === user?.id ? 'Tu usuario' : id}
                    </code>
                  ))}
            </dd>
          </>
        )}
        <dt>Creado por</dt>
        <dd>
          {!hasOwner(record) ? (
            <span className="muted">Anterior a los usuarios</span>
          ) : isOwnedBy(record, user) ? (
            'Tu usuario'
          ) : (
            <code className="small">{record.idUser}</code>
          )}
          {hasOwner(record) && record.nameTypePrivilege && <span className="muted"> · {record.nameTypePrivilege}</span>}
        </dd>
      </dl>
    </div>
  );
}
