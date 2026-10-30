import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useHashRoute } from '../hooks/useHashRoute';
import { userDisplayName } from '../models/user';

// Usuario de la sesion y acceso al login en la barra superior
export function SessionMenu() {
  const auth = useAuth();
  const path = useHashRoute();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (auth.status === 'checking') {
    return <span className="session-menu muted small">Verificando sesion…</span>;
  }

  if (!auth.user) {
    if (path === '/login') return null;
    return (
      <a className="button button--small session-menu" href="#/login">
        Iniciar sesion
      </a>
    );
  }

  const handleLogout = () => {
    setIsLoggingOut(true);
    void auth.logout().finally(() => setIsLoggingOut(false));
  };

  return (
    <span className="session-menu">
      <span className="session-menu__user" title={auth.user.namePrivilege}>
        {userDisplayName(auth.user)}
        {auth.isSuperUser && <span className="session-menu__badge">Super</span>}
      </span>
      <button type="button" className="button button--small" onClick={handleLogout} disabled={isLoggingOut}>
        {isLoggingOut ? 'Cerrando…' : 'Cerrar sesion'}
      </button>
    </span>
  );
}
