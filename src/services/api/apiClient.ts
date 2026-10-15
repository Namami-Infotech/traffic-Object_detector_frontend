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

const getCookieToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)(?:traffic_token|accessToken)=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

class ApiClient {
  public instance: AxiosInstance;

  constructor(baseUrl: string = API_BASE_URL) {
    this.instance = axios.create({
      baseURL: baseUrl,
      withCredentials: true,
    });

    // Request interceptor to attach cookie-based token
    this.instance.interceptors.request.use((config) => {
      const token = getCookieToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for automatic silent token refresh using cookies
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/login') &&
          !originalRequest.url?.includes('/auth/refresh')
        ) {
          originalRequest._retry = true;
          try {
            const refreshRes = await axios.post(
              `${baseUrl}/api/v1/auth/refresh-token`,
              {},
              { withCredentials: true }
            );
            if (refreshRes.data?.success && refreshRes.data?.data?.accessToken) {
              const newToken = refreshRes.data.data.accessToken;
              if (typeof document !== 'undefined') {
                document.cookie = `traffic_token=${newToken}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`;
              }
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              return this.instance(originalRequest);
            }
          } catch {
            // refresh token expired or invalid
          }
        }
        return Promise.reject(error);
      }
    );
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

