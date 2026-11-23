import { useState, type FormEvent } from 'react';
import { createUser, resetUserPassword, type CreateUserBody, type ResetUserPasswordBody, type UpdatePasswordBody } from '../api/auth';
import { listUsers } from '../api/users';
import { useApiMutation } from '../hooks/useApiMutation';
import { useApiQuery } from '../hooks/useApiQuery';
import { useAuth } from '../hooks/useAuth';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { USER_PRIVILEGE, privilegeLabel, userDisplayName, type User } from '../models/user';
import { formatDateTime } from '../utils/format';
import { ErrorBanner } from './ErrorBanner';
import { FormDialog } from './FormDialog';
import { FormField } from './FormField';
import { Pagination } from './Pagination';
import { t } from '../i18n/language';

// Limites de CreateUserFormat / UpdatePasswordFormat / ResetUserPasswordFormat en C-TRD
const USERNAME_MIN = 3;
const USERNAME_MAX = 32;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const NAME_MAX = 100;
const EMAIL_MAX = 254;
const USERNAME_PATTERN = /^[a-z0-9]+$/;
// Validacion basica; C-TRD aplica la regla email completa
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_USERS_LIMIT = 10;
const ALL_PRIVILEGES = Object.values(USER_PRIVILEGE);

// Privilegios que el super usuario puede asignar: solo existe un super usuario (DVAUT014)
const ASSIGNABLE_PRIVILEGES = [USER_PRIVILEGE.genericUser, USER_PRIVILEGE.agent] as const;

type Errors<K extends string> = Partial<Record<K, string>>;

// Valida una contraseña nueva y su confirmacion con los limites de C-TRD
function validateNewPassword(password: string, confirm: string): { password?: string; confirm?: string } {
  if (password.length < PASSWORD_MIN) {
    return { password: t(`Minimo ${PASSWORD_MIN} caracteres.`, `Minimum ${PASSWORD_MIN} characters.`) };
  }
  if (password.length > PASSWORD_MAX) {
    return { password: t(`Maximo ${PASSWORD_MAX} caracteres.`, `Maximum ${PASSWORD_MAX} characters.`) };
  }
  if (password !== confirm) return { confirm: t('Las contraseñas no coinciden.', 'Passwords do not match.') };
  return {};
}

// #/perfil: datos del super usuario, cambio de su contraseña, alta de usuarios y listado de usuarios
// (GET /list/users) con la contraseña nueva de cada uno en un dialog.
// No hay registro publico ni recuperacion por email: el super usuario es el unico que crea usuarios y cambia claves
export function ProfilePage() {
  const auth = useAuth();
  // Cambia al crear un usuario para refrescar el listado
  const [usersVersion, setUsersVersion] = useState(0);
  const user = auth.user;
  if (!user) return null;

  return (
    <main className="page page--narrow">
      <div className="page__head">
        <div>
          <h1>{t('Perfil', 'Profile')}</h1>
          <p className="muted small">
            {t(
              'No hay registro publico ni recuperacion por email: solo el super usuario crea usuarios y cambia contraseñas.',
              'There is no public sign-up nor email recovery: only the super user creates users and changes passwords.',
            )}
          </p>
        </div>
      </div>

      <section className="panel panel--padded" aria-labelledby="profile-data">
        <h2 id="profile-data">{userDisplayName(user)}</h2>
        <dl className="kv">
          <dt>{t('Usuario', 'Username')}</dt>
          <dd>{user.username}</dd>
          <dt>{t('Privilegio', 'Privilege')}</dt>
          <dd>{privilegeLabel(user.tagPrivilege, user.namePrivilege)}</dd>
          <dt>Email</dt>
          <dd>{user.email || '—'}</dd>
          <dt>{t('Ultimo ingreso', 'Last login')}</dt>
          <dd>{formatDateTime(user.lastLoginAt) || '—'}</dd>
          <dt>Id</dt>
          <dd>
            <code className="small">{user.id}</code>
          </dd>
        </dl>
      </section>

      <ChangePasswordForm />
      <CreateUserForm onCreated={() => setUsersVersion((version) => version + 1)} />
      <UsersList version={usersVersion} />
    </main>
  );
}

type ChangeField = keyof UpdatePasswordBody | 'confirm';

// PUT /auth/update/password. C-TRD cierra las demas sesiones del usuario y entrega un token nuevo (useAuth lo guarda)
function ChangePasswordForm() {
  const auth = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [clientErrors, setClientErrors] = useState<Errors<ChangeField>>({});
  const mutation = useApiMutation((body: UpdatePasswordBody, signal: AbortSignal) => auth.changePassword(body, signal));

  const fieldError = (field: ChangeField) =>
    clientErrors[field] ?? (field === 'confirm' ? undefined : mutation.error?.fieldErrors[field]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors: Errors<ChangeField> = {};
    if (!currentPassword) errors.currentPassword = t('Ingresa la contraseña actual.', 'Enter your current password.');
    const fresh = validateNewPassword(newPassword, confirm);
    if (fresh.password) errors.newPassword = fresh.password;
    else if (newPassword === currentPassword) {
      errors.newPassword = t('Debe ser distinta de la actual.', 'It must differ from the current one.');
    }
    if (fresh.confirm) errors.confirm = fresh.confirm;
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const result = await mutation.run({ currentPassword, newPassword });
    setCurrentPassword('');
    if (result.ok) {
      setNewPassword('');
      setConfirm('');
    }
  };

  return (
    <form
      className="panel panel--padded form"
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="change-password"
      id="change-password-form"
    >
      <div>
        <h2 id="change-password">{t('Cambiar mi contraseña', 'Change my password')}</h2>
        <p className="muted small">
          {t(
            'Se cierran tus sesiones en los demas dispositivos; este sigue conectado.',
            'Your sessions on other devices are closed; this one stays logged in.',
          )}
        </p>
      </div>

      {mutation.data !== undefined && (
        <div className="success-banner" role="status">
          <strong>{t('Contraseña actualizada.', 'Password updated.')}</strong>
        </div>
      )}

      {/* Campo oculto para que el gestor de contraseñas asocie la clave al usuario */}
      <input type="text" autoComplete="username" value={auth.user?.username ?? ''} readOnly hidden />
      <FormField label={t('Contraseña actual', 'Current password')} required error={fieldError('currentPassword')}>
        <input
          type="password"
          autoComplete="current-password"
          maxLength={PASSWORD_MAX}
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          disabled={mutation.isPending}
          aria-invalid={!!fieldError('currentPassword')}
        />
      </FormField>
      <NewPasswordFields
        password={newPassword}
        confirm={confirm}
        onPassword={setNewPassword}
        onConfirm={setConfirm}
        passwordError={fieldError('newPassword')}
        confirmError={fieldError('confirm')}
        disabled={mutation.isPending}
      />

      {mutation.error && mutation.error.kind !== 'validation' && <ErrorBanner error={mutation.error} />}

      <div className="form-actions">
        <button type="submit" className="button button--primary" disabled={mutation.isPending}>
          {mutation.isPending ? t('Guardando…', 'Saving…') : t('Cambiar contraseña', 'Change password')}
        </button>
      </div>
    </form>
  );
}

interface CreateUserValues {
  username: string;
  password: string;
  confirm: string;
  idTypePrivilege: string;
  email: string;
  name: string;
  lastName: string;
}

const EMPTY_USER: CreateUserValues = {
  username: '',
  password: '',
  confirm: '',
  idTypePrivilege: USER_PRIVILEGE.genericUser.id,
  email: '',
  name: '',
  lastName: '',
};

type CreateField = keyof CreateUserValues;

function validateUser(values: CreateUserValues): Errors<CreateField> {
  const errors: Errors<CreateField> = {};
  const username = values.username.trim();
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    errors.username = t(
      `Entre ${USERNAME_MIN} y ${USERNAME_MAX} caracteres.`,
      `Between ${USERNAME_MIN} and ${USERNAME_MAX} characters.`,
    );
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username = t('Solo minusculas y numeros, sin espacios.', 'Only lowercase letters and digits, no spaces.');
  }
  const fresh = validateNewPassword(values.password, values.confirm);
  if (fresh.password) errors.password = fresh.password;
  if (fresh.confirm) errors.confirm = fresh.confirm;
  if (!values.idTypePrivilege) errors.idTypePrivilege = t('Elige un privilegio.', 'Choose a privilege.');
  const email = values.email.trim();
  if (email && (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email))) {
    errors.email = t('Email no valido.', 'Invalid email.');
  }
  if (values.name.trim().length > NAME_MAX) errors.name = t(`Maximo ${NAME_MAX} caracteres.`, `Maximum ${NAME_MAX} characters.`);
  if (values.lastName.trim().length > NAME_MAX) {
    errors.lastName = t(`Maximo ${NAME_MAX} caracteres.`, `Maximum ${NAME_MAX} characters.`);
  }
  return errors;
}

// POST /auth/create/user. Los opcionales vacios no se envian (C-TRD rechaza textos vacios)
function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [values, setValues] = useState<CreateUserValues>(EMPTY_USER);
  const [clientErrors, setClientErrors] = useState<Errors<CreateField>>({});
  const [createdUsername, setCreatedUsername] = useState('');
  const mutation = useApiMutation(createUser);

  const set = <K extends CreateField>(key: K, value: CreateUserValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const fieldError = (field: CreateField) =>
    clientErrors[field] ?? (field === 'confirm' ? undefined : mutation.error?.fieldErrors[field]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors = validateUser(values);
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const username = values.username.trim();
    const body: CreateUserBody = { username, password: values.password, idTypePrivilege: values.idTypePrivilege };
    const email = values.email.trim().toLowerCase();
    const name = values.name.trim();
    const lastName = values.lastName.trim();
    if (email) body.email = email;
    if (name) body.name = name;
    if (lastName) body.lastName = lastName;

    const result = await mutation.run(body);
    if (result.ok) {
      setCreatedUsername(username);
      setValues(EMPTY_USER);
      onCreated();
    }
  };

  return (
    <form className="panel panel--padded form" onSubmit={handleSubmit} noValidate aria-labelledby="create-user">
      <div>
        <h2 id="create-user">{t('Crear usuario', 'Create user')}</h2>
        <p className="muted small">
          {t(
            'Entrega el usuario y la contraseña a la persona por un canal seguro; no se envia ningun email.',
            'Give the username and password to the person through a safe channel; no email is sent.',
          )}
        </p>
      </div>

      {mutation.data && (
        <div className="success-banner" role="status">
          <strong>{t(`Usuario ${createdUsername} creado.`, `User ${createdUsername} created.`)}</strong>
        </div>
      )}

      <FormField
        label={t('Usuario', 'Username')}
        required
        error={fieldError('username')}
        hint={t(
          `${USERNAME_MIN} a ${USERNAME_MAX} minusculas o numeros. Con el inicia sesion.`,
          `${USERNAME_MIN} to ${USERNAME_MAX} lowercase letters or digits. Used to log in.`,
        )}
      >
        <input
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={USERNAME_MAX}
          value={values.username}
          onChange={(event) => set('username', event.target.value.toLowerCase())}
          disabled={mutation.isPending}
          aria-invalid={!!fieldError('username')}
        />
      </FormField>
      <FormField label={t('Privilegio', 'Privilege')} required error={fieldError('idTypePrivilege')}>
        <select
          value={values.idTypePrivilege}
          onChange={(event) => set('idTypePrivilege', event.target.value)}
          disabled={mutation.isPending}
          aria-invalid={!!fieldError('idTypePrivilege')}
        >
          {ASSIGNABLE_PRIVILEGES.map((privilege) => (
            <option key={privilege.id} value={privilege.id}>
              {t(privilege.label)}
            </option>
          ))}
        </select>
      </FormField>
      <NewPasswordFields
        password={values.password}
        confirm={values.confirm}
        onPassword={(value) => set('password', value)}
        onConfirm={(value) => set('confirm', value)}
        passwordError={fieldError('password')}
        confirmError={fieldError('confirm')}
        disabled={mutation.isPending}
        label={t('Contraseña', 'Password')}
      />
      <FormField label="Email" error={fieldError('email')}>
        <input
          type="email"
          autoComplete="off"
          maxLength={EMAIL_MAX}
          value={values.email}
          onChange={(event) => set('email', event.target.value)}
          disabled={mutation.isPending}
          aria-invalid={!!fieldError('email')}
        />
      </FormField>
      <FormField label={t('Nombre', 'First name')} error={fieldError('name')}>
        <input
          type="text"
          autoComplete="off"
          maxLength={NAME_MAX}
          value={values.name}
          onChange={(event) => set('name', event.target.value)}
          disabled={mutation.isPending}
          aria-invalid={!!fieldError('name')}
        />
      </FormField>
      <FormField label={t('Apellido', 'Last name')} error={fieldError('lastName')}>
        <input
          type="text"
          autoComplete="off"
          maxLength={NAME_MAX}
          value={values.lastName}
          onChange={(event) => set('lastName', event.target.value)}
          disabled={mutation.isPending}
          aria-invalid={!!fieldError('lastName')}
        />
      </FormField>

      {mutation.error && mutation.error.kind !== 'validation' && <ErrorBanner error={mutation.error} />}

      <div className="form-actions">
        <button type="submit" className="button button--primary" disabled={mutation.isPending}>
          {mutation.isPending ? t('Creando…', 'Creating…') : t('Crear usuario', 'Create user')}
        </button>
      </div>
    </form>
  );
}

// GET /list/users: todos los usuarios (tambien el super usuario y el agente), los mas recientes primero
function UsersList({ version }: { version: number }) {
  const auth = useAuth();
  const [tagPrivilege, setTagPrivilege] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_USERS_LIMIT);
  const debouncedSearch = useDebouncedValue(search.trim());
  const [resetUser, setResetUser] = useState<User | null>(null);

  const list = useApiQuery(
    (signal) => listUsers({ limit, page, search: debouncedSearch, tagPrivilege }, signal),
    [limit, page, debouncedSearch, tagPrivilege, version],
  );

  const scrollToOwnPassword = () =>
    document.getElementById('change-password-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <section className="stack" aria-labelledby="users-title">
      <div className="page__head">
        <h2 id="users-title">{t('Usuarios', 'Users')}</h2>
        <div className="filters">
          <label className="field">
            <span>{t('Privilegio', 'Privilege')}</span>
            <select
              value={tagPrivilege}
              onChange={(event) => {
                setTagPrivilege(event.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('Todos', 'All')}</option>
              {ALL_PRIVILEGES.map((privilege) => (
                <option key={privilege.tag} value={privilege.tag}>
                  {t(privilege.label)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('Buscar', 'Search')}</span>
            <input
              type="search"
              placeholder={t('Usuario, email o nombre', 'Username, email or name')}
              value={search}
              maxLength={100}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
      </div>

      {list.error && <ErrorBanner error={list.error} onRetry={list.refetch} stale={!!list.data} />}

      <div className="panel" aria-busy={list.isLoading || list.isRefreshing}>
        {list.isLoading ? (
          <p className="empty">{t('Cargando usuarios…', 'Loading users…')}</p>
        ) : (
          list.data &&
          (list.data.users.length === 0 ? (
            <p className="empty">{t('No hay usuarios con estos filtros.', 'No users match these filters.')}</p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table--cards">
                  <thead>
                    <tr>
                      <th scope="col">{t('Usuario', 'Username')}</th>
                      <th scope="col">{t('Nombre', 'Name')}</th>
                      <th scope="col">Email</th>
                      <th scope="col">{t('Privilegio', 'Privilege')}</th>
                      <th scope="col">{t('Ultimo ingreso', 'Last login')}</th>
                      <th scope="col">{t('Creado', 'Created')}</th>
                      <th scope="col" aria-label={t('Acciones', 'Actions')} />
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.users.map((item) => {
                      const isSelf = item.id === auth.user?.id;
                      const fullName = [item.name, item.lastName].filter(Boolean).join(' ');
                      return (
                        <tr key={item.id} className="table__row">
                          <td className="cell--main">
                            <strong>{item.username}</strong>
                            {!item.isActive && <div className="muted small">{t('inactivo', 'inactive')}</div>}
                          </td>
                          <td data-label={t('Nombre', 'Name')}>{fullName || '—'}</td>
                          <td data-label="Email">{item.email || '—'}</td>
                          <td data-label={t('Privilegio', 'Privilege')}>
                            {privilegeLabel(item.tagPrivilege, item.namePrivilege)}
                          </td>
                          <td data-label={t('Ultimo ingreso', 'Last login')}>
                            {formatDateTime(item.lastLoginAt) || '—'}
                          </td>
                          <td data-label={t('Creado', 'Created')}>{formatDateTime(item.createdDate)}</td>
                          <td className="cell--actions">
                            {/* La propia contraseña pide la actual: se usa "Cambiar mi contraseña" */}
                            {isSelf ? (
                              <button type="button" className="button button--small" onClick={scrollToOwnPassword}>
                                {t('Mi contraseña', 'My password')}
                              </button>
                            ) : (
                              <button type="button" className="button button--small" onClick={() => setResetUser(item)}>
                                {t('Cambiar contraseña', 'Change password')}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={page}
                limit={limit}
                total={list.data.page}
                onPageChange={setPage}
                onLimitChange={(value) => {
                  setLimit(value);
                  setPage(1);
                }}
              />
            </>
          ))
        )}
      </div>

      <FormDialog
        open={resetUser !== null}
        title={t('Cambiar contraseña', 'Change password')}
        onClose={() => setResetUser(null)}
      >
        {resetUser && <ResetPasswordForm key={resetUser.id} user={resetUser} onClose={() => setResetUser(null)} />}
      </FormDialog>
    </section>
  );
}

type ResetField = keyof ResetUserPasswordBody | 'confirm';

// PUT /auth/update/user/password. C-TRD cierra todas las sesiones de ese usuario
function ResetPasswordForm({ user, onClose }: { user: User; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [clientErrors, setClientErrors] = useState<Errors<ResetField>>({});
  // C-TRD responde sin data (omitempty), asi que el exito no se lee de mutation.data
  const [updated, setUpdated] = useState(false);
  const mutation = useApiMutation(resetUserPassword);

  const fieldError = (field: ResetField) =>
    clientErrors[field] ?? (field === 'confirm' ? undefined : mutation.error?.fieldErrors[field]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors: Errors<ResetField> = {};
    const fresh = validateNewPassword(newPassword, confirm);
    if (fresh.password) errors.newPassword = fresh.password;
    if (fresh.confirm) errors.confirm = fresh.confirm;
    setClientErrors(errors);
    setUpdated(false);
    if (Object.keys(errors).length > 0) return;

    const result = await mutation.run({ idUser: user.id, newPassword });
    if (result.ok) {
      setUpdated(true);
      setNewPassword('');
      setConfirm('');
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <p className="muted small">
        <strong>{userDisplayName(user)}</strong> (
        {userDisplayName(user) !== user.username && `${user.username}, `}
        {privilegeLabel(user.tagPrivilege, user.namePrivilege)}).{' '}
        {t(
          'Se cierran todas sus sesiones; entregale la contraseña nueva por un canal seguro.',
          'All their sessions are closed; give them the new password through a safe channel.',
        )}
      </p>

      {updated && (
        <div className="success-banner" role="status">
          <strong>{t('Contraseña del usuario actualizada.', "User's password updated.")}</strong>
        </div>
      )}

      {/* Para que el gestor de contraseñas la asocie a este usuario y no al de la sesion */}
      <input type="text" autoComplete="username" value={user.username} readOnly hidden />
      <NewPasswordFields
        password={newPassword}
        confirm={confirm}
        onPassword={setNewPassword}
        onConfirm={setConfirm}
        passwordError={fieldError('newPassword')}
        confirmError={fieldError('confirm')}
        disabled={mutation.isPending}
      />

      {mutation.error && mutation.error.kind !== 'validation' && <ErrorBanner error={mutation.error} />}

      <div className="form-actions">
        <button type="submit" className="button button--primary" disabled={mutation.isPending}>
          {mutation.isPending ? t('Guardando…', 'Saving…') : t('Asignar contraseña', 'Set password')}
        </button>
        <button type="button" className="button button--ghost" onClick={onClose} disabled={mutation.isPending}>
          {updated ? t('Cerrar', 'Close') : t('Cancelar', 'Cancel')}
        </button>
      </div>
    </form>
  );
}

interface NewPasswordFieldsProps {
  password: string;
  confirm: string;
  onPassword: (value: string) => void;
  onConfirm: (value: string) => void;
  passwordError?: string;
  confirmError?: string;
  disabled: boolean;
  label?: string;
}

// Contraseña nueva y su confirmacion (la confirmacion solo se valida aqui, no viaja a C-TRD)
function NewPasswordFields({
  password,
  confirm,
  onPassword,
  onConfirm,
  passwordError,
  confirmError,
  disabled,
  label = t('Contraseña nueva', 'New password'),
}: NewPasswordFieldsProps) {
  return (
    <>
      <FormField
        label={label}
        required
        error={passwordError}
        hint={t(`${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres.`, `${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`)}
      >
        <input
          type="password"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
          value={password}
          onChange={(event) => onPassword(event.target.value)}
          disabled={disabled}
          aria-invalid={!!passwordError}
        />
      </FormField>
      <FormField label={t('Repite la contraseña', 'Repeat the password')} required error={confirmError}>
        <input
          type="password"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
          value={confirm}
          onChange={(event) => onConfirm(event.target.value)}
          disabled={disabled}
          aria-invalid={!!confirmError}
        />
      </FormField>
    </>
  );
}
