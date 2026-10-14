import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';

export interface Booking {
  id: string;
  vehicleNumber: string; // Gadi number
  userName: string; // Name
  phoneNumber: string; // Phone number
  bookingDate: string; // Booking date
  startDate: string; // Start date
  endDate: string; // End date
  parkingLotId?: string | null;
  parkingLotName?: string | null;
  slotNumber?: string | null;
  totalAmount?: number | null;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
  notes?: string | null;
  qrCode?: string | null;
  qrCodeUrl?: string | null;
  isExpired?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingInput {
  vehicleNumber: string;
  userName: string;
  phoneNumber: string;
  bookingDate?: string;
  startDate: string;
  endDate: string;
  parkingLotId?: string;
  parkingLotName?: string;
  slotNumber?: string;
  totalAmount?: number;
  status?: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
  notes?: string;
}

export interface BookingStats {
  total: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
  expired?: number;
  totalRevenue: number;
  todayBookings: number;
}

export const bookingApi = {
  // GET /api/v1/booking/stats
  getStats(): Promise<ApiResponse<BookingStats>> {
    return apiClient.get<BookingStats>('/api/v1/booking/stats');
  },

  // GET /api/v1/booking/verify-qr/:id
  verifyQr(id: string): Promise<ApiResponse<{ valid: boolean; expired: boolean; message: string; booking: Booking | null }>> {
    return apiClient.get<{ valid: boolean; expired: boolean; message: string; booking: Booking | null }>(`/api/v1/booking/verify-qr/${encodeURIComponent(id)}`);
  },

  // POST /api/v1/booking/scan-qr
  scanQr(data: { qrData: string; action?: 'VERIFY' | 'CHECK_IN' | 'CHECK_OUT' }): Promise<
    ApiResponse<{
      accessGranted: boolean;
      status: string;
      message: string;
      validUntil?: string;
      remainingTime?: string;
      booking: Booking | null;
    }>
  > {
    return apiClient.post('/api/v1/booking/scan-qr', data);
  },

  // GET /api/v1/booking
  getAll(params?: {
    search?: string;
    status?: string;
    parkingLotId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<Booking[]>> {
    return apiClient.get<Booking[]>('/api/v1/booking', params);
  },

  // GET /api/v1/booking/:id
  getById(id: string): Promise<ApiResponse<Booking>> {
    return apiClient.get<Booking>(`/api/v1/booking/${encodeURIComponent(id)}`);
  },

  // POST /api/v1/booking
  create(data: BookingInput): Promise<ApiResponse<Booking>> {
    return apiClient.post<Booking>('/api/v1/booking', data);
  },

  // PUT /api/v1/booking/:id
  update(id: string, data: Partial<BookingInput>): Promise<ApiResponse<Booking>> {
    return apiClient.put<Booking>(`/api/v1/booking/${encodeURIComponent(id)}`, data);
  },

  // DELETE /api/v1/booking/:id
  delete(id: string): Promise<ApiResponse<any>> {
    return apiClient.delete<any>(`/api/v1/booking/${encodeURIComponent(id)}`);
  },
};
