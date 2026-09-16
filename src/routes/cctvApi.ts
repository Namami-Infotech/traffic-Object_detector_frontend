// Backward compatibility re-export from new API layer
import { cameraApi, detectionApi, analyticsApi } from '../services/api';
import type { CameraInput, DetectionLogInput } from '../services/api';

export type { CameraInput, DetectionLogInput };

export async function getCameras() {
  return cameraApi.getAll();
}

export async function createCamera(data: CameraInput) {
  return cameraApi.create(data);
}

export async function updateCameraStatus(id: string, data: { status?: string; enabled?: boolean }) {
  return cameraApi.updateStatus(id, data);
}

export async function getCameraById(id: string) {
  return cameraApi.getById(id);
}

export async function createDetectionLog(data: DetectionLogInput) {
  return detectionApi.createLog(data);
}

export async function clearDetectionLogs() {
  return detectionApi.clearLogs();
}

export async function getAnalytics(cameraId?: string) {
  return analyticsApi.getAnalytics(cameraId);
}
