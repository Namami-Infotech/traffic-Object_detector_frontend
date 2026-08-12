import React from 'react';
import { CctvViewer } from './CctvViewer';
import type { DetectionUpdateData } from './CctvViewer';
import { Radio, MapPin, Navigation, EyeOff } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio color="#10b981" size={20} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Multi-Camera AI Pipeline ({activeCameras.length} Active Feeds)
          </h2>
        </div>
        <span style={{ fontSize: '0.8rem', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          ⚡ 5 FPS Target Engine
        </span>
      </div>

      {/* Concurrent Multi-Camera Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: activeCameras.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
          gap: '1.2rem',
        }}
      >
        {activeCameras.map((cam) => (
          <div
            key={cam.id}
            className="glass-panel"
            style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.8)' }}
          >
            {/* Camera Header Banner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '6px',
                marginBottom: '0.6rem',
                paddingBottom: '0.4rem',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <span style={{ color: '#60a5fa' }}>{cam.cameraName}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>({cam.id})</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <MapPin size={12} color="#f59e0b" /> {cam.location}
                </span>
                {cam.lane && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Navigation size={12} color="#10b981" /> {cam.lane} ({cam.direction || 'NORTH'})
                  </span>
                )}
              </div>
            </div>

            {/* Individual Throttled Stream Processor View */}
            <CctvViewer
              selectedCameraUrl={cam.rtspUrl}
              cameraType={cam.cameraType || 'WEBCAM'}
              cameraId={cam.id}
              onDetectionUpdate={(data) => onDetectionUpdate(cam.id, data)}
              onModelLoaded={(loaded) => onModelLoaded?.(loaded)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
