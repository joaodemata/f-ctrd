import { useAuth } from '../hooks/useAuth';
import { userDisplayName } from '../models/user';

// Se muestra en lugar de las rutas del super usuario (triggers, condiciones y Google Trends)
export function RestrictedPage() {
  const auth = useAuth();
  // Ruta pedida con sus parametros, para volver a ella despues del login
  const target = window.location.hash.replace(/^#/, '') || '/';

  if (auth.status === 'checking') {
    return (
      <main className="page page--narrow">
        <p className="empty">Verificando la sesion…</p>
      </main>
    );
  }

  return (
    <main className="page page--narrow">
      <div className="page__head">
        <h1>Acceso restringido</h1>
      </div>
      <section className="panel panel--padded">
        {auth.user ? (
          <p>
            Tu usuario <strong>{userDisplayName(auth.user)}</strong> ({auth.user.namePrivilege}) no tiene permisos para
            esta seccion: es solo del super usuario.
          </p>
        ) : (
          <p>Esta seccion es solo del super usuario. Inicia sesion para continuar.</p>
        )}
        <div className="form-actions">
          {!auth.user && (
            <a className="button button--primary" href={`#/login?next=${encodeURIComponent(target)}`}>
              Iniciar sesion
            </a>
          )}
          <a className="button" href="#/">
            Ver oportunidades
          </a>
        </div>
      </section>
    </main>
  );
}
