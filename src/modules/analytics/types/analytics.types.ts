import type { VehicleInOutMetrics } from '../../../services/api';

export interface TrafficCounts {
  [vehicleClass: string]: number;
}

export interface MergedVehicleInOut {
  [vehicleClass: string]: VehicleInOutMetrics;
}

export interface AnalyticsSummaryState {
  totalIn: number;
  totalOut: number;
  totalDetections?: number;
  summary: Record<string, number>;
}
