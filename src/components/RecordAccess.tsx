import { useAuth } from '../hooks/useAuth';
import { hasOwner, isOwnedBy, privilegeLabel, type RecordOwner } from '../models/user';
import { VISIBILITY, hasVisibility, visibilityLabel, type RecordVisibility } from '../models/visibility';
import { t } from '../i18n/language';

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
      <h4>{t('Usuario y visibilidad', 'User and visibility')}</h4>
      <dl className="kv">
        <dt>{t('Visibilidad', 'Visibility')}</dt>
        <dd title={record.descriptionTypeVisibility || undefined}>
          {visibilityLabel(record)}
          {!hasVisibility(record) && <span className="muted"> · {t('anterior a la visibilidad', 'predates visibility')}</span>}
        </dd>
        {isWhitelist && (
          <>
            <dt>{t('Lista', 'List')}</dt>
            <dd>
              {allowedUsers.length === 0
                ? '—'
                : allowedUsers.map((id) => (
                    <code key={id} className="small record-access__user">
                      {id === user?.id ? t('Tu usuario', 'Your user') : id}
                    </code>
                  ))}
            </dd>
          </>
        )}
        <dt>{t('Creado por', 'Created by')}</dt>
        <dd>
          {!hasOwner(record) ? (
            <span className="muted">{t('Anterior a los usuarios', 'Predates users')}</span>
          ) : isOwnedBy(record, user) ? (
            t('Tu usuario', 'Your user')
          ) : (
            <code className="small">{record.idUser}</code>
          )}
          {hasOwner(record) && record.tagTypePrivilege && (
            <span className="muted"> · {privilegeLabel(record.tagTypePrivilege, record.nameTypePrivilege)}</span>
          )}
        </dd>
      </dl>
    </div>
  );
}
