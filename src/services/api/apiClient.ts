import { API_BASE_URL } from '../../app/config/env.config';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
  total?: number;
  [key: string]: any;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = `${this.baseUrl}${cleanPath}`;

    if (!params) return fullUrl;

    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        query.append(key, String(val));
      }
    });

    const queryString = query.toString();
    return queryString ? `${fullUrl}?${queryString}` : fullUrl;
  }

  async request<T = any>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { body, params, headers, ...customConfig } = options;
    const url = this.buildUrl(path, params);

    const isJsonBody = body && typeof body === 'object' && !(body instanceof FormData);

    const config: RequestInit = {
      ...customConfig,
      headers: {
        ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      ...(body ? { body: isJsonBody ? JSON.stringify(body) : body } : {}),
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          message: data?.message || `HTTP ${response.status}: Request failed`,
          ...data,
        };
      }

      return data;
    } catch (error: any) {
      console.warn(`[ApiClient] Request to ${url} failed:`, error.message);
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

  patch<T = any>(path: string, body?: any, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  delete<T = any>(path: string, options?: RequestOptions) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
