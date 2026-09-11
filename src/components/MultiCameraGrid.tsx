import React from 'react';
import { CctvViewer } from './CctvViewer';
import type { DetectionUpdateData } from './CctvViewer';
import { EyeOff } from 'lucide-react';

interface CameraItem {
  id: string;
  cameraName: string;
  location: string;
  rtspUrl: string;
  cameraType?: 'WEBCAM' | 'USB_PHONE' | 'IP_RTSP' | 'DROIDCAM' | 'FILE';
  lane?: string;
  direction?: string;
  status?: string;
  enabled?: boolean;
}

interface MultiCameraGridProps {
  cameras: CameraItem[];
  onDetectionUpdate: (cameraId: string, data: DetectionUpdateData) => void;
  onModelLoaded?: (loaded: boolean) => void;
}

export const MultiCameraGrid: React.FC<MultiCameraGridProps> = ({
  cameras,
  onDetectionUpdate,
  onModelLoaded,
}) => {
  const activeCameras = cameras.filter((c) => c.enabled !== false);

  if (activeCameras.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <EyeOff size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
        <h3>No Active Cameras Enabled</h3>
        <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>Enable cameras from the configuration panel to start multi-camera AI stream processing.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: activeCameras.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: '1.2rem',
      }}
    >
      {activeCameras.map((cam) => (
        <CctvViewer
          key={cam.id}
          selectedCameraUrl={cam.rtspUrl}
          cameraType={cam.cameraType || 'WEBCAM'}
          cameraId={cam.id}
          cameraName={cam.cameraName}
          location={cam.location}
          lane={cam.lane}
          direction={cam.direction}
          onDetectionUpdate={(data) => onDetectionUpdate(cam.id, data)}
          onModelLoaded={(loaded) => onModelLoaded?.(loaded)}
        />
      ))}
    </div>
  );
};
