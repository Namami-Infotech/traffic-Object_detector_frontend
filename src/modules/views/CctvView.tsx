import React from 'react';
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
  searchTerm?: string;
}

export const CctvView: React.FC<CctvViewProps> = ({
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
  searchTerm = '',
}) => {
  const filteredCameras = React.useMemo(() => {
    if (!searchTerm?.trim()) return cameras;
    const q = searchTerm.toLowerCase();
    return cameras.filter(
      (c) =>
        c.cameraName?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        c.lane?.toLowerCase().includes(q)
    );
  }, [cameras, searchTerm]);

  return (
    <div style={{ padding: '0.4rem 0.5rem' }}>
      {/* Live Surveillance Grid Area */}
      <div className="app-main-grid">
        <div>
          {viewMode === 'GRID' ? (
            <MultiCameraGrid
              cameras={filteredCameras}
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
