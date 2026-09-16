export interface TrackedObject {
  id: number;
  label: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  prevBbox?: [number, number, number, number];
  centroid: [number, number]; // [cx, cy]
  trajectory: Array<[number, number]>;
  disappeared: number;
  isStationary: boolean;
  isCrossing?: boolean;
  fullBodyCrossed?: boolean;
  crossedIn: boolean;
  crossedOut: boolean;
  lastCrossedTimestamp?: number;
  labelVotes?: Record<string, number>;
  loggedToDb?: boolean;
}

export interface LineConfig {
  orientation: 'HORIZONTAL' | 'VERTICAL';
  positionPercent: number; // 10 to 90 %
}

export interface LineCrossingEvent {
  id: number;
  label: string;
  score: number;
  timestamp: number;
}

export interface DetectionUpdateData {
  counts: Record<string, number>;
  inCount: number;
  outCount: number;
  activeCount: number;
  inEvents?: Array<{ id: number; label: string; score?: number; timestamp: number }>;
  outEvents?: Array<{ id: number; label: string; score?: number; timestamp: number }>;
  detectionEvents?: Array<{ id: number; label: string; score?: number; timestamp: number }>;
  log: any[];
}

export interface DetectionLogEntry {
  id: string;
  cameraId?: string;
  cameraName?: string;
  camera?: {
    id?: string;
    cameraName?: string;
    location?: string;
    lane?: string;
    direction?: string;
  };
  vehicleType: string;
  trackId?: number;
  event: 'IN' | 'OUT' | 'STABLE' | 'DETECTION';
  confidence: number;
  count: number;
  detectedAt: string | Date;
  location?: string;
}
