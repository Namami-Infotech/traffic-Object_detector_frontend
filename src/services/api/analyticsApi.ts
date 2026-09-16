import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';

export interface VehicleInOutMetrics {
  in: number;
  out: number;
  total?: number;
}

export interface AnalyticsData {
  totalIn: number;
  totalOut: number;
  summary: Record<string, number>;
  vehicleInOut?: Record<string, VehicleInOutMetrics>;
  recentLogs?: any[];
  [key: string]: any;
}

export const analyticsApi = {
  // GET /api/v1/cctv/analytics
  getAnalytics(cameraId?: string): Promise<ApiResponse<AnalyticsData>> {
    return apiClient.get<AnalyticsData>('/api/v1/cctv/analytics', cameraId ? { cameraId } : undefined);
  },
};
