import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';

export interface ParkingInput {
  name: string;
  location?: string;
  totalSpace: number;
  pricePerHour?: number;
  priceTwoWheeler?: number;
  description?: string;
  [key: string]: any;
}

export interface ParkingStats {
  totalSlots: number;
  totalOccupied: number;
  totalAvailable: number;
  totalLots: number;
  lots?: any[];
}

export const parkingApi = {
  // GET /api/v1/parking/stats
  getStats(): Promise<ApiResponse<ParkingStats>> {
    return apiClient.get<ParkingStats>('/api/v1/parking/stats');
  },

  // GET /api/v1/parking
  getAll(): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>('/api/v1/parking');
  },

  // GET /api/v1/parking/:id
  getById(id: string): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`/api/v1/parking/${encodeURIComponent(id)}`);
  },

  // POST /api/v1/parking
  create(data: ParkingInput): Promise<ApiResponse<any>> {
    return apiClient.post<any>('/api/v1/parking', data);
  },

  // PUT /api/v1/parking/:id
  update(id: string, data: Partial<ParkingInput>): Promise<ApiResponse<any>> {
    return apiClient.put<any>(`/api/v1/parking/${encodeURIComponent(id)}`, data);
  },

  // DELETE /api/v1/parking/:id
  delete(id: string): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(`/api/v1/parking/${encodeURIComponent(id)}`);
  },

  // POST /api/v1/parking/:id/occupancy
  updateOccupancy(id: string, delta: number): Promise<ApiResponse<any>> {
    return apiClient.post<any>(`/api/v1/parking/${encodeURIComponent(id)}/occupancy`, { delta });
  },
};
