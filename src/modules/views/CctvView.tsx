import React from 'react';
import { Camera, Plus } from 'lucide-react';
import { MultiCameraGrid } from '../camera/components/MultiCameraGrid';
import { CameraCard } from '../camera/components/CameraCard';
import { TrafficAnalytics } from '../analytics/components/TrafficAnalytics';

export interface CctvViewProps {
  canWrite?: boolean;
  cameras?: any[];
  activeCamera?: any;
  viewMode?: 'GRID' | 'SINGLE';
  handleDetectionUpdate?: (camId: string, data: any) => void;
  setIsAiLoading?: (loading: boolean) => void;
  displayLiveCounts?: Record<string, number>;
  mergedVehicleInOut?: Record<string, { in: number; out: number }>;
  displayInCount?: number;
  displayOutCount?: number;
  displayActiveCount?: number;
  dbCameraStats?: any;
  cameraVehicleInOutMap?: Record<string, Record<string, { in: number; out: number }>>;
  onOpenPlateScanner?: () => void;
  onOpenAddCamera?: () => void;
}

export const CctvView: React.FC<CctvViewProps> = ({
  canWrite = false,
  cameras = [],
  activeCamera,
  viewMode = 'GRID',
  handleDetectionUpdate,
  setIsAiLoading,
  displayLiveCounts = {},
  mergedVehicleInOut = {},
  displayInCount = 0,
  displayOutCount = 0,
  displayActiveCount = 0,
  dbCameraStats = {},
  cameraVehicleInOutMap = {},
  onOpenPlateScanner,
  onOpenAddCamera,
}) => {
  return (
    <div style={{ padding: '0.4rem 0.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={22} color="var(--accent-blue)" />
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              CCTV Live Surveillance Module
            </h2>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Real-time multi-camera CCTV monitoring, RTSP video streaming, YOLO vehicle detection &amp; traffic flow telemetry
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onOpenPlateScanner && (
            <button
              type="button"
              onClick={onOpenPlateScanner}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Scan Plate (ANPR)
            </button>
          )}

          {canWrite && onOpenAddCamera && (
            <button
              type="button"
              onClick={onOpenAddCamera}
              style={{
                background: 'var(--accent-blue)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={16} />
              Add CCTV Camera
            </button>
          )}
        </div>
      </div>

      {/* Live Surveillance Grid Area */}
      <div className="app-main-grid">
        <div>
          {viewMode === 'GRID' ? (
            <MultiCameraGrid
              cameras={cameras}
              onDetectionUpdate={handleDetectionUpdate || (() => {})}
              onModelLoaded={(loaded) => setIsAiLoading && setIsAiLoading(!loaded)}
            />
          ) : (
            <CameraCard
              selectedCameraUrl={activeCamera?.rtspUrl}
              cameraType={activeCamera?.cameraType || 'WEBCAM'}
              cameraId={activeCamera?.id}
              cameraName={activeCamera?.cameraName}
              location={activeCamera?.location}
              lane={activeCamera?.lane}
              direction={activeCamera?.direction}
              onDetectionUpdate={(data) => handleDetectionUpdate && handleDetectionUpdate(activeCamera?.id, data)}
              onModelLoaded={(loaded) => setIsAiLoading && setIsAiLoading(!loaded)}
            />
          )}
        </div>

        <div>
          <TrafficAnalytics
            counts={displayLiveCounts}
            vehicleInOut={mergedVehicleInOut}
            inCount={displayInCount}
            outCount={displayOutCount}
            activeCount={displayActiveCount}
            cameras={cameras}
            cameraStats={dbCameraStats as any}
            cameraLiveVehicleInOut={cameraVehicleInOutMap}
          />
        </div>
      </div>
    </div>
  );
};
