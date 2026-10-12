import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';

export interface StaffInput {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  badgeNumber?: string;
  role: string;
  password?: string;
  [key: string]: any;
}

export const staffApi = {
  // GET /api/v1/users?type=staff
  getAll(): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>('/api/v1/users', { type: 'staff' });
  },

  // POST /api/v1/users (staff member)
  create(data: StaffInput): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/v1/users', data);
  },

  // PUT /api/v1/users/:id
  update(id: string, data: Partial<StaffInput>): Promise<ApiResponse<any>> {
    return apiClient.put<any>(`/api/v1/users/${encodeURIComponent(id)}`, data);
  },

  // DELETE /api/v1/users/:id
  delete(id: string): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(`/api/v1/users/${encodeURIComponent(id)}`);
  },
};
