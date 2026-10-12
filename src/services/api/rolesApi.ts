import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';

export interface RoleInput {
  name?: string;
  displayName: string;
  description?: string;
  moduleAccess?: any;
}

export const rolesApi = {
  // GET /api/v1/roles
  getAll(): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>('/api/v1/roles');
  },

  // GET /api/v1/roles/:id
  getById(id: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`/api/v1/roles/${encodeURIComponent(id)}`);
  },

  // POST /api/v1/roles
  create(data: RoleInput): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/v1/roles', data);
  },

  // PUT /api/v1/roles/:id
  update(id: string, data: Partial<RoleInput>): Promise<ApiResponse<any>> {
    return apiClient.put<any>(`/api/v1/roles/${encodeURIComponent(id)}`, data);
  },

  // DELETE /api/v1/roles/:id
  delete(id: string): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(`/api/v1/roles/${encodeURIComponent(id)}`);
  },

  // GET /api/v1/roles/system-modules
  getSystemModules(): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>('/api/v1/roles/system-modules');
  },

  // GET /api/v1/roles/user-access/:userId?
  getUserModuleAccess(userId?: string): Promise<ApiResponse<any>> {
    const url = userId ? `/api/v1/roles/user-access/${encodeURIComponent(userId)}` : '/api/v1/roles/user-access';
    return apiClient.get<any>(url);
  },
};
