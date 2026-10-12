import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';

export interface DetectionLogInput {
  cameraId: string;
  vehicleType: string;
  trackId?: number;
  event: 'IN' | 'OUT' | 'STABLE' | 'DETECTION';
  plateNumber?: string;
  plateConfidence?: number;
  confidence?: number;
  count?: number;
  inCount?: number;
  outCount?: number;
}

export interface GetDetectionLogsParams {
  page?: number;
  limit?: number;
  search?: string;
  event?: string;
  vehicleType?: string;
  cameraId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface DetectionLogsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedDetectionLogsResponse {
  logs: any[];
  pagination: DetectionLogsPagination;
}

export const detectionApi = {
  // GET /api/v1/cctv/detection-logs
  getDetectionLogs(params?: GetDetectionLogsParams): Promise<ApiResponse<PaginatedDetectionLogsResponse>> {
    return apiClient.get('/api/v1/cctv/detection-logs', params as any);
  },

  // POST /api/v1/cctv/detection-logs
  createLog(data: DetectionLogInput): Promise<ApiResponse<any>> {
    return apiClient.post('/api/v1/cctv/detection-logs', data);
  },

  // DELETE /api/v1/cctv/detection-logs
  clearLogs(): Promise<ApiResponse<any>> {
    return apiClient.delete('/api/v1/cctv/detection-logs');
  },

  // POST /api/v1/vehicles/recognize-plate
  recognizePlate(image: string, isDirectCrop?: boolean): Promise<ApiResponse<any>> {
    return apiClient.post('/api/v1/vehicles/recognize-plate', { image, isDirectCrop });
  },

  // POST /vehicles/detect
  detectVehicles(image: string): Promise<ApiResponse<any>> {
    return apiClient.post('/vehicles/detect', { image });
  },
};

