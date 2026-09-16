import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';
import { API_BASE_URL } from '../../app/config/env.config';

export interface CameraInput {
  id?: string;
  cameraName: string;
  location: string;
  rtspUrl: string;
  cameraType?: string;
  lane?: string;
  direction?: string;
  enabled?: boolean;
}

export interface CameraEntity extends CameraInput {
  id: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const cameraApi = {
  // GET /api/v1/cctv/cameras
  getAll(): Promise<ApiResponse<CameraEntity[]>> {
    return apiClient.get<CameraEntity[]>('/api/v1/cctv/cameras');
  },

  // GET /api/v1/cctv/cameras/:id
  getById(id: string): Promise<ApiResponse<CameraEntity>> {
    return apiClient.get<CameraEntity>(`/api/v1/cctv/cameras/${encodeURIComponent(id)}`);
  },

  // POST /api/v1/cctv/cameras
  create(data: CameraInput): Promise<ApiResponse<CameraEntity>> {
    return apiClient.post<CameraEntity>('/api/v1/cctv/cameras', data);
  },

  // PATCH /api/v1/cctv/cameras/:id
  updateStatus(id: string, data: { status?: string; enabled?: boolean }): Promise<ApiResponse<CameraEntity>> {
    return apiClient.patch<CameraEntity>(`/api/v1/cctv/cameras/${encodeURIComponent(id)}`, data);
  },

  // Helper for MJPEG stream URL
  getStreamUrl(id: string): string {
    return `${API_BASE_URL || ''}/api/v1/cctv/cameras/${encodeURIComponent(id)}/stream`;
  },
};
