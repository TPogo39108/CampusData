
export enum UserRole {
  ADMIN = 'Administrator',
  USER = 'User',
  GUEST = 'Guest'
}

export enum AppRole {
  MASTER = 'MASTER',
  EDITOR = 'EDITOR'
}

export interface AppEditor {
  id: string;
  username: string;
  passwordHash: string;
  active: boolean;
}

export interface ObjectRoleDefinition {
  id: string;
  objectName: string;
  objectKey: string;
  roleName: string;
  roleKey: string;
}

export interface CategoryDefinition {
  id: string;
  name: string;
  description: string;
}

export interface FieldVisibilityConfig {
  showSystemFields: boolean;
  showPersonalFields: boolean;
  showAddressFields: boolean;
  showCommunicationFields: boolean;
  showUdfFields: boolean;
  showRolesFields: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  editorUsername: string;
  targetUserId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  details: string;
}

export interface PlatformUser {
  id: string;
  active: boolean;
  globalRole: UserRole;
  localRoleIds: string[];
  category: string; // Ref-ID from CategoryDefinition
  externalAccount: string;
  login: string;
  password: string;
  language: 'de' | 'en';
  salutation: string;
  firstname: string;
  lastname: string;
  title: string;
  birthday: string;
  email: string;
  institution: string;
  department: string;
  street: string;
  city: string;
  postalCode: string;
  countryIso: string;
  countryPlain: string;
  phone: string; // Phone Home
  phoneOffice: string;
  mobile: string; // Phone Mobile
  fax: string;
  hobby: string;
  comment: string;
  matriculation: string;
  udf1: string;
  udf2: string;
  udf3: string;
  udf4: string;
  udf5: string;
  unlimitedAccess: boolean;
  limitedAccessFrom?: string;
  limitedAccessUntil?: string;
  skinId: string;
  authMode: 'default' | 'oidc';
}

export interface SyncStatus {
  lastSync: Date | null;
  status: 'idle' | 'syncing' | 'error' | 'success';
}
