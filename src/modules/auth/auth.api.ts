import { apiClient } from '../../services/api/apiClient';
import type { AuthUser, LoginResponse } from './auth.types';

export const authApi = {
  /**
   * Log in user using username/email and password
   */
  async login(identifier: string, password: string): Promise<{ success: boolean; data?: LoginResponse; message?: string }> {
    const res = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
      email: identifier,
      password,
    });
    return res;
  },

  /**
   * Register a new user
   */
  async register(data: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    role?: string;
    password?: string;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    const res = await apiClient.post<any>('/api/v1/auth/register', data);
    return res;
  },

  /**
   * Fetch current user profile with roleDetails and moduleAccess
   */
  async getProfile(): Promise<{ success: boolean; data?: AuthUser; message?: string }> {
    const res = await apiClient.get<AuthUser>('/api/v1/users/profile');
    return res;
  },

  /**
   * Fetch specific user's module access
   */
  async getUserModuleAccess(userId?: string): Promise<{ success: boolean; data?: any; message?: string }> {
    const url = userId ? `/api/v1/roles/user-access/${userId}` : '/api/v1/roles/user-access';
    return apiClient.get(url);
  },

  /**
   * Fetch all roles
   */
  async getRoles(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    return apiClient.get('/api/v1/roles');
  },

  /**
   * Fetch all system modules
   */
  async getSystemModules(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    return apiClient.get('/api/v1/roles/system-modules');
  },

  /**
   * Log out user & clear backend auth cookies
   */
  async logout(): Promise<{ success: boolean; message?: string }> {
    return apiClient.post('/api/v1/auth/logout');
  },

  /**
   * Refresh token
   */
  async refreshToken(): Promise<{ success: boolean; data?: any; message?: string }> {
    return apiClient.post('/api/v1/auth/refresh-token');
  },
};
