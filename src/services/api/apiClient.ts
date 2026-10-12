import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../../app/config/env.config';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
  total?: number;
  [key: string]: any;
}

export interface RequestOptions extends AxiosRequestConfig {
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  public instance: AxiosInstance;

  constructor(baseUrl: string = API_BASE_URL) {
    this.instance = axios.create({
      baseURL: baseUrl,
    });

    // Request interceptor to automatically attach authorization token
    this.instance.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('traffic_auth_token') : null;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async request<T = any>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { body, data, method = 'GET', ...customConfig } = options;
    const requestData = body !== undefined ? body : data;

    try {
      const response = await this.instance.request<any>({
        url: path,
        method,
        data: requestData,
        ...customConfig,
      });

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const responseData = error.response.data || {};
        return {
          success: false,
          message: responseData?.message || `HTTP ${error.response.status}: Request failed`,
          ...responseData,
        };
      }
      console.warn(`[ApiClient] Request to ${path} failed:`, error.message);
      return {
        success: false,
        message: error.message || 'Network error occurred',
      };
    }
  }

  get<T = any>(path: string, params?: Record<string, string | number | boolean | undefined>, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'GET', params });
  }

  post<T = any>(path: string, body?: any, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  put<T = any>(path: string, body?: any, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  patch<T = any>(path: string, body?: any, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  delete<T = any>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;

