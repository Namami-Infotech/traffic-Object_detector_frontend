import { apiClient } from './apiClient';
import type { ApiResponse } from './apiClient';

export interface TollItem {
  id: string;
  name: string;
  ratePerEntry: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface TollInput {
  name: string;
  ratePerEntry: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface TollBookingItem {
  id: string;
  userName: string;
  phoneNumber: string;
  vehicleNumber: string;
  normalizedPlate: string;
  tollId?: string | null;
  tollName: string;
  ratePerEntry: number;
  bookedCount: number; // Total trips booked (1, 2, 3, 4, 5...)
  remainingCount: number; // Remaining trips (1 minus on each IN event)
  totalAmount: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  paymentStatus?: 'PAID' | 'PENDING' | 'FAILED' | 'CASH';
  paymentMethod?: 'RAZORPAY' | 'CASH' | string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  bookingDate: string;
  validUntil: string;
  qrCode?: string | null;
  notes?: string | null;
  bookedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TollBookingInput {
  userName: string;
  phoneNumber: string;
  vehicleNumber: string;
  tollId?: string;
  tollName?: string;
  bookedCount: number; // Kitne time ke liye booking kr rha h (1, 2, 3, 4...)
  ratePerEntry?: number;
  validDays?: number;
  notes?: string;
  paymentStatus?: 'PAID' | 'PENDING' | 'FAILED' | 'CASH';
  paymentMethod?: 'RAZORPAY' | 'CASH' | string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
}

export interface TollEntryLogItem {
  id: string;
  bookingId: string;
  vehicleNumber: string;
  normalizedPlate: string;
  tollId?: string | null;
  tollName: string;
  previousCount: number;
  deductedCount: number;
  remainingCount: number;
  entryTime: string;
  cameraId?: string | null;
  source: 'MANUAL' | 'ANPR_CAMERA' | 'API';
  notes?: string | null;
  createdAt?: string;
}

export interface DeductTollInput {
  vehicleNumber: string;
  tollId?: string;
  cameraId?: string;
  source?: 'MANUAL' | 'ANPR_CAMERA' | 'API';
  notes?: string;
}

export interface DeductTollData {
  bookingId?: string;
  vehicleNumber: string;
  normalizedPlate: string;
  userName?: string;
  tollName?: string;
  previousCount: number;
  deducted: number;
  remainingCount: number;
  totalBooked?: number;
  status: string;
  entryTime?: string;
  entryLogId?: string;
}

export const tollApi = {
  // ==========================================
  // TOLL PLAZAS
  // ==========================================
  getAll(): Promise<ApiResponse<TollItem[]>> {
    return apiClient.get<TollItem[]>('/api/v1/toll');
  },

  getById(id: string): Promise<ApiResponse<TollItem>> {
    return apiClient.get<TollItem>(`/api/v1/toll/${encodeURIComponent(id)}`);
  },

  create(data: TollInput): Promise<ApiResponse<TollItem>> {
    return apiClient.post<TollItem>('/api/v1/toll', data);
  },

  update(id: string, data: Partial<TollInput>): Promise<ApiResponse<TollItem>> {
    return apiClient.put<TollItem>(`/api/v1/toll/${encodeURIComponent(id)}`, data);
  },

  delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/v1/toll/${encodeURIComponent(id)}`);
  },

  // ==========================================
  // TOLL BOOKINGS (User details + Count 1,2,3,4...)
  // ==========================================
  getAllBookings(params?: { search?: string; status?: string; vehicleNumber?: string }): Promise<ApiResponse<TollBookingItem[]>> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.vehicleNumber) query.append('vehicleNumber', params.vehicleNumber);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<TollBookingItem[]>(`/api/v1/toll/bookings${qs}`);
  },

  getBookingById(id: string): Promise<ApiResponse<TollBookingItem>> {
    return apiClient.get<TollBookingItem>(`/api/v1/toll/bookings/${encodeURIComponent(id)}`);
  },

  createOrder(data: {
    amount: number;
    vehicleNumber: string;
    userName: string;
    phoneNumber: string;
    tollName?: string;
    bookedCount?: number;
  }): Promise<ApiResponse<{ orderId: string; amount: number; amountInRupees: number; currency: string; keyId: string; receipt?: string }>> {
    return apiClient.post('/api/v1/toll/bookings/create-order', data);
  },

  createBooking(data: TollBookingInput): Promise<ApiResponse<TollBookingItem>> {
    return apiClient.post<TollBookingItem>('/api/v1/toll/bookings', data);
  },

  deleteBooking(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api/v1/toll/bookings/${encodeURIComponent(id)}`);
  },

  // ==========================================
  // VEHICLE IN & TRIP DEDUCTION API (-1 on every IN)
  // ==========================================
  deductToll(data: DeductTollInput): Promise<ApiResponse<DeductTollData>> {
    return apiClient.post<DeductTollData>('/api/v1/toll/deduct', data);
  },

  // ==========================================
  // TOLL ENTRY AUDIT LOGS
  // ==========================================
  getEntryLogs(limit = 100): Promise<ApiResponse<TollEntryLogItem[]>> {
    return apiClient.get<TollEntryLogItem[]>(`/api/v1/toll/logs?limit=${limit}`);
  },
};
