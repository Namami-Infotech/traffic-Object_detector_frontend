import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';

export interface TollItem {
  id: string;
  name: string;
  ratePerEntry: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface TollInput {
  name: string;
  ratePerEntry: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export const tollApi = {
  // GET /api/v1/toll
  getAll(): Promise<ApiResponse<TollItem[]>> {
    return apiClient.get<TollItem[]>('/api/v1/toll');
  },

  // GET /api/v1/toll/:id
  getById(id: string): Promise<ApiResponse<TollItem>> {
    return apiClient.get<TollItem>(`/api/v1/toll/${encodeURIComponent(id)}`);
  },

  // POST /api/v1/toll
  create(data: TollInput): Promise<ApiResponse<TollItem>> {
    return apiClient.post<TollItem>('/api/v1/toll', data);
  },

  // PUT /api/v1/toll/:id
  update(id: string, data: Partial<TollInput>): Promise<ApiResponse<TollItem>> {
    return apiClient.put<TollItem>(`/api/v1/toll/${encodeURIComponent(id)}`, data);
  },

  // DELETE /api/v1/toll/:id
  delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/v1/toll/${encodeURIComponent(id)}`);
  },
};
