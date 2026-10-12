import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';

export interface UserInput {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  password?: string;
  role?: string;
  [key: string]: any;
}

export const usersApi = {
  // GET /api/v1/users?type=...
  getAll(params?: { type?: string; [key: string]: any }): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>('/api/v1/users', params);
  },

  // GET /api/v1/users/:id
  getById(id: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`/api/v1/users/${encodeURIComponent(id)}`);
  },

  // POST /api/v1/users
  create(data: UserInput): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/v1/users', data);
  },

  // PUT /api/v1/users/:id
  update(id: string, data: Partial<UserInput>): Promise<ApiResponse<any>> {
    return apiClient.put<any>(`/api/v1/users/${encodeURIComponent(id)}`, data);
  },

  // DELETE /api/v1/users/:id
  delete(id: string): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(`/api/v1/users/${encodeURIComponent(id)}`);
  },

  // GET /api/v1/users/profile
  getProfile(): Promise<ApiResponse<any>> {
    return apiClient.get<any>('/api/v1/users/profile');
  },
};
