import { API_BASE_URL } from './config';

export interface CameraInput {
  id?: string;
  cameraName: string;
  location: string;
  rtspUrl: string;
  cameraType?: string;
  lane?: string;
  direction?: string;
  enabled?: boolean;
}

export interface DetectionLogInput {
  cameraId: string;
  vehicleType: string;
  trackId?: number;
  event: 'IN' | 'OUT' | 'STABLE' | 'DETECTION';
  confidence?: number;
  count?: number;
  inCount?: number;
  outCount?: number;
}

/**
 * CCTV API Service functions
 */

// GET /api/v1/cctv/cameras - Fetch all registered CCTV cameras
export async function getCameras() {
  const res = await fetch(`${API_BASE_URL}/api/v1/cctv/cameras`);
  return res.json();
}

// POST /api/v1/cctv/cameras - Register a new camera
export async function createCamera(data: CameraInput) {
  const res = await fetch(`${API_BASE_URL}/api/v1/cctv/cameras`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// PATCH /api/v1/cctv/cameras/:id - Update camera status / toggle enabled
export async function updateCameraStatus(id: string, data: { status?: string; enabled?: boolean }) {
  const res = await fetch(`${API_BASE_URL}/api/v1/cctv/cameras/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// GET /api/v1/cctv/cameras/:id - Get camera details and recent logs
export async function getCameraById(id: string) {
  const res = await fetch(`${API_BASE_URL}/api/v1/cctv/cameras/${id}`);
  return res.json();
}

// POST /api/v1/cctv/detection-logs - Save detection event to DB
export async function createDetectionLog(data: DetectionLogInput) {
  const res = await fetch(`${API_BASE_URL}/api/v1/cctv/detection-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// DELETE /api/v1/cctv/detection-logs - Clear all database logs
export async function clearDetectionLogs() {
  const res = await fetch(`${API_BASE_URL}/api/v1/cctv/detection-logs`, {
    method: 'DELETE',
  });
  return res.json();
}

// GET /api/v1/cctv/analytics - Fetch traffic counts and stats
export async function getAnalytics(cameraId?: string) {
  const url = cameraId ? `${API_BASE_URL}/api/v1/cctv/analytics?cameraId=${encodeURIComponent(cameraId)}` : `${API_BASE_URL}/api/v1/cctv/analytics`;
  const res = await fetch(url);
  return res.json();
}

