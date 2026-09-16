import type { CameraType } from '../types/camera.types';

export function isRtspUrl(url?: string, cameraType?: CameraType | string): boolean {
  if (!url) return false;
  return (
    url.startsWith('rtsp://') ||
    url.startsWith('rtsps://') ||
    cameraType === 'IP_RTSP'
  );
}

export function extractCameraIp(url?: string, defaultName?: string): string {
  if (!url) return defaultName || 'IP Camera';
  const match = url.match(/@([0-9.]+):/) || url.match(/\/\/([0-9.]+):/);
  return match ? match[1] : defaultName || 'IP Camera';
}

export function isDirectMediaFileUrl(url?: string): boolean {
  if (!url) return false;
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.endsWith('.mp4') ||
    url.endsWith('.webm')
  );
}
