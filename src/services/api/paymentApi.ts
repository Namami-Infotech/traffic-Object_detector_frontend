import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';

export interface PaymentKeyConfig {
  keyId: string;
}

export interface PaymentOrderResponse {
  orderId: string;
  amount: number;
  amountInRupees: number;
  currency: string;
  keyId: string;
  receipt?: string;
  status?: string;
}

export interface PaymentVerifyResponse {
  verified: boolean;
  orderId: string;
  paymentId: string;
}

export const paymentApi = {
  getKeyConfig(): Promise<ApiResponse<PaymentKeyConfig>> {
    return apiClient.get<PaymentKeyConfig>('/api/v1/payment/key');
  },

  createOrder(data: {
    amount: number;
    currency?: string;
    receipt?: string;
    notes?: Record<string, string>;
  }): Promise<ApiResponse<PaymentOrderResponse>> {
    return apiClient.post<PaymentOrderResponse>('/api/v1/payment/create-order', data);
  },

  verify(data: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): Promise<ApiResponse<PaymentVerifyResponse>> {
    return apiClient.post<PaymentVerifyResponse>('/api/v1/payment/verify', data);
  },
};
