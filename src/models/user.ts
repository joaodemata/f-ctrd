import { isSetObjectId, type ObjectId } from './opportunity';

// Espejo de models/users_model.go (UsersModelType). Los datos de la contraseña, del login y de auditoria son json:"-"
export interface User {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  lastName: string | null;
  // Privilegio (catalogo USER_PRIVILEGES). Solo existe un super usuario
  idTypePrivilege: string;
  tagPrivilege: string;
  namePrivilege: string;
  descriptionPrivilege: string;
  isActive: boolean;
  lastLoginAt: string | null;
  // Limites para futuras funcionalidades, null es sin limite
  maxTriggersQuantity: number | null;
  maxConditionsQuantity: number | null;
  availableApis: string[];
  config: Record<string, unknown>;
  idCreatedBy: string | null;
  lastUpdatedAt: string;
  createdDate: string;
}

// Espejo de RecordOwnerData (models/users_model.go): usuario que creo el registro con su privilegio al momento de
// crearlo. Va inline en triggers, condiciones y oportunidades. Los registros anteriores a los usuarios traen el id
// cero y textos vacios, ver hasOwner
export interface RecordOwner {
  idUser: ObjectId;
  idTypePrivilege: ObjectId;
  tagTypePrivilege: string;
  nameTypePrivilege: string;
  descriptionTypePrivilege: string;
}

export function hasOwner(record: RecordOwner): boolean {
  return isSetObjectId(record.idUser);
}

// El registro lo creo el usuario de la sesion
export function isOwnedBy(record: RecordOwner, user: User | null | undefined): boolean {
  return !!user && hasOwner(record) && record.idUser === user.id;
}

// common/constants.go -> UserPrivilegeSuperUser / UserPrivilegeGenericUser
export const USER_PRIVILEGE = {
  superUser: { id: '6ae38e7bb1bb56b09f96ce13', tag: 'SUPER_USER' },
  genericUser: { id: '6ae38ef3b1bb56b09f96ce14', tag: 'GENERIC_USER' },
} as const;

// Igual que models.UserIsSuperUser: se compara el id del privilegio
export function isSuperUser(user: User | null | undefined): boolean {
  return user?.idTypePrivilege === USER_PRIVILEGE.superUser.id;
}

export function userDisplayName(user: User): string {
  const fullName = [user.name, user.lastName].filter(Boolean).join(' ');
  return fullName || user.username;
}
