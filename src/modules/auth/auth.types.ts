export interface ModulePermission {
  moduleId: string;
  moduleName: string;
  actions: string[];
  description?: string;
}

export interface RoleDetails {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  moduleAccess: ModulePermission[];
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleId?: string | null;
  roleDetails?: RoleDetails | null;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}
