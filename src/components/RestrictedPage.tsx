import { useAuth } from '../hooks/useAuth';
import { privilegeLabel, userDisplayName } from '../models/user';
import { t } from '../i18n/language';

// Se muestra en lugar de las rutas del super usuario (triggers, condiciones y Google Trends)
export function RestrictedPage() {
  const auth = useAuth();
  // Ruta pedida con sus parametros, para volver a ella despues del login
  const target = window.location.hash.replace(/^#/, '') || '/';

  if (auth.status === 'checking') {
    return (
      <main className="page page--narrow">
        <p className="empty">{t('Verificando la sesion…', 'Checking the session…')}</p>
      </main>
    );
  }

  return (
    <main className="page page--narrow">
      <div className="page__head">
        <h1>{t('Acceso restringido', 'Restricted access')}</h1>
      </div>
      <section className="panel panel--padded">
        {auth.user ? (
          <p>
            {t('Tu usuario', 'Your user')} <strong>{userDisplayName(auth.user)}</strong> (
            {privilegeLabel(auth.user.tagPrivilege, auth.user.namePrivilege)})
            {t(
              ' no tiene permisos para esta seccion: es solo del super usuario.',
              ' has no access to this section: it is for the super user only.',
            )}
          </p>
        ) : (
          <p>
            {t(
              'Esta seccion es solo del super usuario. Inicia sesion para continuar.',
              'This section is for the super user only. Log in to continue.',
            )}
          </p>
        )}
        <div className="form-actions">
          {!auth.user && (
            <a className="button button--primary" href={`#/login?next=${encodeURIComponent(target)}`}>
              {t('Iniciar sesion', 'Log in')}
            </a>
          )}
          <a className="button" href="#/">
            {t('Ver oportunidades', 'See opportunities')}
          </a>
        </div>
      </section>
    </main>
  );
}
