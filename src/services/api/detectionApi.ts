import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';

export interface DetectionLogInput {
  cameraId: string;
  vehicleType: string;
  trackId?: number;
  event: 'IN' | 'OUT' | 'STABLE' | 'DETECTION';
  confidence?: number;
  count?: number;
  inCount?: number;
  outCount?: number;
}

export const detectionApi = {
  // POST /api/v1/cctv/detection-logs
  createLog(data: DetectionLogInput): Promise<ApiResponse<any>> {
    return apiClient.post('/api/v1/cctv/detection-logs', data);
  },

  // DELETE /api/v1/cctv/detection-logs
  clearLogs(): Promise<ApiResponse<any>> {
    return apiClient.delete('/api/v1/cctv/detection-logs');
  },
};
