/**
 * Centralized Traffic & AI Processing Configuration
 */
export const TRAFFIC_CONFIG = {
  // AI Model Configuration
  AI: {
    CONFIDENCE_THRESHOLD: 0.25, // Lowered for high sensitivity on CCTV and screen feeds
    DETECTION_INTERVAL_MS: 200, // 5 FPS frame sampling target per camera
    ALLOWED_CLASSES: ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'person'],
  },

  // Configurable Traffic Density Thresholds
  DENSITY_THRESHOLDS: {
    LOW_MAX: 5,       // 0 to 5 vehicles: LOW
    MEDIUM_MAX: 12,   // 6 to 12 vehicles: MEDIUM
    // Above 12: HIGH / Heavy Congestion
  },

  // Camera Connection & Stream Settings
  STREAM: {
    RECONNECT_INTERVAL_MS: 5000, // Auto reconnection attempt delay
    MAX_RETRY_ATTEMPTS: 10,
  },
};

export type TrafficDensityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export function calculateTrafficDensity(activeVehicleCount: number): TrafficDensityLevel {
  if (activeVehicleCount <= TRAFFIC_CONFIG.DENSITY_THRESHOLDS.LOW_MAX) {
    return 'LOW';
  } else if (activeVehicleCount <= TRAFFIC_CONFIG.DENSITY_THRESHOLDS.MEDIUM_MAX) {
    return 'MEDIUM';
  } else {
    return 'HIGH';
  }
}
