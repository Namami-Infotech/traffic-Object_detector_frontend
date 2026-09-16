import { useState, useEffect, useCallback } from 'react';
import { cameraService } from '../services/cameraService';
import type { CameraItem } from '../types/camera.types';

const DEFAULT_WEBCAM: CameraItem = {
  id: 'default-webcam',
  cameraName: 'Local Webcam / USB Camera',
  location: 'Main Gate Intersection',
  rtspUrl: 'webcam',
  cameraType: 'WEBCAM',
  lane: 'Lane 1',
  direction: 'NORTH',
  enabled: true,
};

export function useCameraList() {
  const [cameras, setCameras] = useState<CameraItem[]>([DEFAULT_WEBCAM]);
  const [activeCameraId, setActiveCameraId] = useState<string>('default-webcam');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCameras = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cameraService.getAllCameras();
      if (Array.isArray(data) && data.length > 0) {
        setCameras((prev) => {
          const ids = new Set(prev.map((c) => c.id));
          const newCams = (data as CameraItem[]).filter((c) => !ids.has(c.id));
          return [...newCams, ...prev];
        });

        // Auto-select IP/RTSP camera if present
        const ipCam = data.find(
          (c) =>
            c.rtspUrl &&
            c.rtspUrl !== 'webcam' &&
            (c.rtspUrl.startsWith('rtsp://') ||
              c.rtspUrl.startsWith('rtsps://') ||
              c.cameraType === 'IP_RTSP' ||
              c.cameraType === 'DVR_ANALOG')
        );
        if (ipCam) {
          setActiveCameraId(ipCam.id);
        }
      }
    } catch (err) {
      console.warn('Failed to load registered cameras from backend:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  const addCamera = useCallback((newCam: CameraItem) => {
    setCameras((prev) => [newCam, ...prev]);
    setActiveCameraId(newCam.id);
  }, []);

  const activeCamera = cameras.find((c) => c.id === activeCameraId) || cameras[0] || DEFAULT_WEBCAM;

  return {
    cameras,
    setCameras,
    activeCamera,
    activeCameraId,
    setActiveCameraId,
    addCamera,
    loading,
    refresh: fetchCameras,
  };
}
