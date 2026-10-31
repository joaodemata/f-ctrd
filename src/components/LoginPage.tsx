import { useEffect, useState, type FormEvent } from 'react';
import type { LoginBody } from '../api/auth';
import { useApiMutation } from '../hooks/useApiMutation';
import { useAuth } from '../hooks/useAuth';
import { useHashParams } from '../hooks/useHashRoute';
import { userDisplayName } from '../models/user';
import { ErrorBanner } from './ErrorBanner';
import { FormField } from './FormField';
import { SeedwiseLogo } from './SeedwiseLogo';

interface FieldErrors {
  username?: string;
  password?: string;
}

// Solo rutas internas del hash: evita que ?next= lleve a otro sitio
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && next !== '/login' ? next : '/';
}

// #/login?next=/triggers vuelve a la ruta indicada al iniciar sesion
export function LoginPage() {
  const auth = useAuth();
  const next = safeNext(useHashParams().get('next'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const mutation = useApiMutation((body: LoginBody, signal: AbortSignal) => auth.login(body, signal));

  useEffect(() => {
    if (mutation.data) window.location.hash = `#${next}`;
  }, [mutation.data, next]);

  const fieldError = (field: keyof FieldErrors) => clientErrors[field] ?? mutation.error?.fieldErrors[field];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    // Mismos limites que LoginFormat en C-TRD
    const errors: FieldErrors = {};
    if (!username.trim()) errors.username = 'Ingresa el usuario.';
    else if (username.trim().length > 32) errors.username = 'Maximo 32 caracteres.';
    if (!password) errors.password = 'Ingresa la contraseña.';
    else if (password.length > 128) errors.password = 'Maximo 128 caracteres.';
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) return;

    void mutation.run({ username: username.trim().toLowerCase(), password }).then((result) => {
      if (!result.ok) setPassword('');
    });
  };

  if (auth.status === 'authenticated' && auth.user && !mutation.data) {
    return (
      <main className="page page--narrow">
        <LoginHero />
        <div className="page__head">
          <h1>Sesion iniciada</h1>
        </div>
        <section className="panel panel--padded">
          <p>
            Estas conectado como <strong>{userDisplayName(auth.user)}</strong> ({auth.user.namePrivilege}).
          </p>
          <div className="form-actions">
            <a className="button button--primary" href={`#${next}`}>
              Continuar
            </a>
            <button type="button" className="button" onClick={() => void auth.logout()}>
              Cerrar sesion
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page page--narrow">
      <LoginHero />
      <div className="page__head">
        <div>
          <h1>Iniciar sesion</h1>
          <p className="muted small">
            La sesion es opcional: sin ella ves las oportunidades publicas y la ayuda. Con sesion ves tambien tus
            oportunidades y las compartidas contigo. Triggers, condiciones y Google Trends son solo del super usuario.
          </p>
        </div>
      </div>

      <form className="panel panel--padded form" onSubmit={handleSubmit} noValidate>
        <FormField label="Usuario" required error={fieldError('username')}>
          <input
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={32}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={mutation.isPending}
            aria-invalid={!!fieldError('username')}
            autoFocus
          />
        </FormField>

        <FormField label="Contraseña" required error={fieldError('password')}>
          <input
            type="password"
            autoComplete="current-password"
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={mutation.isPending}
            aria-invalid={!!fieldError('password')}
          />
        </FormField>

        {mutation.error && mutation.error.kind !== 'validation' && <ErrorBanner error={mutation.error} />}

        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Ingresando…' : 'Ingresar'}
          </button>
          <a className="button" href="#/">
            Continuar sin sesion
          </a>
        </div>
      </form>
    </main>
  );
}

// Logo grande animado de seedwise.io sobre el formulario
function LoginHero() {
  return (
    <div className="login-hero">
      <SeedwiseLogo animated className="seedwise-logo--sway" title="seedwise.io" />
      <span className="login-hero__name">seedwise</span>
    </div>
  );
}
