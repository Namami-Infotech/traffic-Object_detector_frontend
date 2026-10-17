import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';

export interface HistoricalPlaceItem {
  id: string;
  name: string;
  about: string;
  photos: string[]; // Photo in array
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface HistoricalPlaceInput {
  name: string;
  about: string;
  photos: string[]; // Photo in array (URLs)
  files?: File[]; // Uploaded image files
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

export const historicalPlaceApi = {
  // GET /api/v1/historical-places
  getAll(params?: { search?: string; status?: string }): Promise<ApiResponse<HistoricalPlaceItem[]>> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<HistoricalPlaceItem[]>(`/api/v1/historical-places${qs}`);
  },

  // GET /api/v1/historical-places/:id
  getById(id: string): Promise<ApiResponse<HistoricalPlaceItem>> {
    return apiClient.get<HistoricalPlaceItem>(`/api/v1/historical-places/${encodeURIComponent(id)}`);
  },

  // POST /api/v1/historical-places (JSON or FormData if files are present)
  create(data: HistoricalPlaceInput): Promise<ApiResponse<HistoricalPlaceItem>> {
    if (data.files && data.files.length > 0) {
      const fd = new FormData();
      fd.append('name', data.name);
      fd.append('about', data.about);
      if (data.location) fd.append('location', data.location);
      if (data.latitude !== undefined && data.latitude !== null) fd.append('latitude', String(data.latitude));
      if (data.longitude !== undefined && data.longitude !== null) fd.append('longitude', String(data.longitude));
      if (data.status) fd.append('status', data.status);
      if (data.photos && data.photos.length > 0) {
        fd.append('existingPhotos', JSON.stringify(data.photos));
      }
      data.files.forEach((file) => {
        fd.append('photos', file);
      });
      return apiClient.post<HistoricalPlaceItem>('/api/v1/historical-places', fd);
    }
    return apiClient.post<HistoricalPlaceItem>('/api/v1/historical-places', data);
  },

  // PUT /api/v1/historical-places/:id (JSON or FormData if files are present)
  update(id: string, data: Partial<HistoricalPlaceInput>): Promise<ApiResponse<HistoricalPlaceItem>> {
    if (data.files && data.files.length > 0) {
      const fd = new FormData();
      if (data.name) fd.append('name', data.name);
      if (data.about) fd.append('about', data.about);
      if (data.location !== undefined) fd.append('location', data.location || '');
      if (data.latitude !== undefined && data.latitude !== null) fd.append('latitude', String(data.latitude));
      if (data.longitude !== undefined && data.longitude !== null) fd.append('longitude', String(data.longitude));
      if (data.status) fd.append('status', data.status);
      if (data.photos !== undefined) {
        fd.append('existingPhotos', JSON.stringify(data.photos));
      }
      data.files.forEach((file) => {
        fd.append('photos', file);
      });
      return apiClient.put<HistoricalPlaceItem>(`/api/v1/historical-places/${encodeURIComponent(id)}`, fd);
    }
    return apiClient.put<HistoricalPlaceItem>(`/api/v1/historical-places/${encodeURIComponent(id)}`, data);
  },

  // DELETE /api/v1/historical-places/:id
  delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/v1/historical-places/${encodeURIComponent(id)}`);
  },
};
