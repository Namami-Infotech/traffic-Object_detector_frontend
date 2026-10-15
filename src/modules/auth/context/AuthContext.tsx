import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser, RoleDetails, ModulePermission } from '../auth.types';
import { authApi } from '../auth.api';

interface AuthContextType {
  user: AuthUser | null;
  role: string | null;
  roleDetails: RoleDetails | null;
  moduleAccess: ModulePermission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  refreshPermissions: () => Promise<void>;
  hasModuleAccess: (moduleId: string) => boolean;
  hasActionPermission: (moduleId: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'traffic_auth_token';
const USER_KEY = 'traffic_auth_user';

const ACTIVE_SYSTEM_MODULES = new Set(['cctv', 'detection', 'users', 'parking', 'booking', 'toll', 'staff', 'roles']);

const sanitizeModules = (modules: ModulePermission[], role?: string | null): ModulePermission[] => {
  const filtered = Array.isArray(modules)
    ? modules.filter((m) => m && m.moduleId && ACTIVE_SYSTEM_MODULES.has(m.moduleId))
    : [];

  if (role === 'ADMIN') {
    const existingIds = new Set(filtered.map((m) => m.moduleId));
    for (const modId of ACTIVE_SYSTEM_MODULES) {
      if (!existingIds.has(modId)) {
        filtered.push({
          moduleId: modId,
          moduleName:
            modId === 'booking'
              ? 'Vehicle Bookings'
              : modId === 'parking'
              ? 'Smart Parking'
              : modId === 'toll'
              ? 'Toll Management'
              : modId.toUpperCase(),
          actions: ['read', 'write', 'delete'],
        });
      }
    }
  }

  return filtered;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [moduleAccess, setModuleAccess] = useState<ModulePermission[]>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return sanitizeModules(parsed?.roleDetails?.moduleAccess || [], parsed?.role);
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Function to explicitly call the Get Permission API from backend
  const fetchUserPermissions = useCallback(async (userId?: string) => {
    try {
      const res = await authApi.getUserModuleAccess(userId);
      if (res.success && res.data) {
        const currentRole = res.data.role || user?.role;
        const perms: ModulePermission[] = sanitizeModules(res.data.modules || [], currentRole);
        setModuleAccess(perms);
        setUser((prev) => {
          if (!prev) return prev;
          const updated: AuthUser = {
            ...prev,
            role: res.data.role || prev.role,
            roleDetails: {
              ...(prev.roleDetails || {
                id: '',
                name: res.data.role || prev.role,
                displayName: res.data.displayName || prev.role,
              }),
              displayName: res.data.displayName || prev.role,
              moduleAccess: perms,
            },
          };
          localStorage.setItem(USER_KEY, JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err: any) {
      console.warn('[AuthContext] Failed to fetch user permissions from API:', err.message);
    }
  }, [user?.role]);

  // Sync / refresh profile & permissions on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      authApi.getProfile().then(async (res) => {
        if (res.success && res.data) {
          const sanitized = sanitizeModules(res.data.roleDetails?.moduleAccess || [], res.data.role);
          const cleanUser: AuthUser = {
            ...res.data,
            roleDetails: {
              ...(res.data.roleDetails || {
                id: '',
                name: res.data.role,
                displayName: res.data.role,
              }),
              displayName: res.data.roleDetails?.displayName || res.data.role,
              moduleAccess: sanitized,
            },
          };
          setUser(cleanUser);
          setModuleAccess(sanitized);
          localStorage.setItem(USER_KEY, JSON.stringify(cleanUser));
          await fetchUserPermissions(cleanUser.id);
        }
      }).catch(async () => {
        await fetchUserPermissions();
      });
    }
  }, [fetchUserPermissions]);

  const login = useCallback(async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      // 1. Authenticate user
      const res = await authApi.login(identifier, password);
      if (res.success && res.data) {
        const { user: userData, accessToken } = res.data;
        localStorage.setItem(TOKEN_KEY, accessToken);

        // 2. Immediately call Get Permission API for this user
        let finalModules: ModulePermission[] = sanitizeModules(userData.roleDetails?.moduleAccess || [], userData.role);
        try {
          const permRes = await authApi.getUserModuleAccess(userData.id);
          if (permRes.success && permRes.data?.modules) {
            finalModules = sanitizeModules(permRes.data.modules, permRes.data.role || userData.role);
            userData.role = permRes.data.role || userData.role;
            userData.roleDetails = {
              ...(userData.roleDetails || {
                id: '',
                name: userData.role,
                displayName: permRes.data.displayName || userData.role,
              }),
              displayName: permRes.data.displayName || userData.role,
              moduleAccess: finalModules,
            };
          }
        } catch (permErr: any) {
          console.warn('Permissions API warning:', permErr.message);
        }

        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setUser(userData);
        setModuleAccess(finalModules);

        return { success: true };
      } else {
        return {
          success: false,
          message: res.message || 'Login failed. Please check credentials.',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Network error occurred during login',
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setModuleAccess([]);
  }, []);

  const refreshPermissions = useCallback(async () => {
    if (user?.id) {
      await fetchUserPermissions(user.id);
    }
  }, [user?.id, fetchUserPermissions]);

  const role = user?.role || null;
  const roleDetails = user?.roleDetails || null;

  const hasModuleAccess = useCallback(
    (moduleId: string) => {
      if (!user) return false;
      if (user.role === 'ADMIN') return true;
      return moduleAccess.some(
        (m) => m.moduleId.toLowerCase() === moduleId.toLowerCase()
      );
    },
    [user, moduleAccess]
  );

  const hasActionPermission = useCallback(
    (moduleId: string, action: string) => {
      if (!user) return false;
      if (user.role === 'ADMIN') return true;
      const mod = moduleAccess.find(
        (m) => m.moduleId.toLowerCase() === moduleId.toLowerCase()
      );
      if (!mod) return false;
      return mod.actions?.includes(action.toLowerCase()) || false;
    },
    [user, moduleAccess]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        roleDetails,
        moduleAccess,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshPermissions,
        hasModuleAccess,
        hasActionPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
