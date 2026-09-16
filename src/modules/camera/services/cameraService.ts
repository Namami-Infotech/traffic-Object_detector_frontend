import { cameraApi } from '../../../services/api';
import type { CameraInput, CameraEntity } from '../../../services/api';
import type { VideoDeviceInfo } from '../types/camera.types';

export const cameraService = {
  getAllCameras(): Promise<CameraEntity[]> {
    return cameraApi.getAll().then((res) => (res.success && res.data ? res.data : []));
  },

  createCamera(data: CameraInput) {
    return cameraApi.create(data);
  },

  updateCameraStatus(id: string, data: { status?: string; enabled?: boolean }) {
    return cameraApi.updateStatus(id, data);
  },

  async enumerateVideoDevices(): Promise<VideoDeviceInfo[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    try {
      let devices = await navigator.mediaDevices.enumerateDevices();
      let videoInputs = devices.filter((d) => d.kind === 'videoinput');

      // Check if labels are empty (requires permission)
      const hasLabels = videoInputs.some((d) => d.label.length > 0);
      if (!hasLabels && navigator.mediaDevices.getUserMedia) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
          tempStream.getTracks().forEach((track) => track.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
          videoInputs = devices.filter((d) => d.kind === 'videoinput');
        } catch {
          // Ignore permission denial
        }
      }

      return videoInputs.map((d, idx) => ({
        deviceId: d.deviceId,
        label: d.label || `USB / Camera Device ${idx + 1}`,
      }));
    } catch (err) {
      console.warn('Failed to enumerate video devices:', err);
      return [];
    }
  },
};
