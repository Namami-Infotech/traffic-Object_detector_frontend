import { useState, useEffect, useCallback, useRef } from 'react';
import { Radio } from 'lucide-react';
import { Navbar } from './components/layout/Navbar';
import { MultiCameraGrid } from './modules/camera/components/MultiCameraGrid';
import { CameraCard } from './modules/camera/components/CameraCard';
import { CameraFormModal } from './modules/camera/components/CameraFormModal';
import { useCameraList } from './modules/camera/hooks/useCameraList';
import { TrafficAnalytics } from './modules/analytics/components/TrafficAnalytics';
import { useTrafficAnalytics } from './modules/analytics/hooks/useTrafficAnalytics';
import { DetectionHistoryTable } from './modules/detection/components/DetectionHistoryTable';
import type { DetectionUpdateData, DetectionLogEntry } from './modules/detection/types/detection.types';
import { socketClient } from './services/socket/socketClient';

export function App() {
  const [viewMode] = useState<'GRID' | 'SINGLE'>('GRID');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(true);

  // Modular Camera List Hook
  const { cameras, activeCamera, activeCameraId, addCamera } = useCameraList();

  // Camera Metrics Maps (Isolated per camera ID to prevent cross-camera fluctuation)
  const [cameraInMap, setCameraInMap] = useState<Record<string, number>>({});
  const [cameraOutMap, setCameraOutMap] = useState<Record<string, number>>({});
  const [cameraActiveMap, setCameraActiveMap] = useState<Record<string, number>>({});
  const [cameraLiveCountsMap, setCameraLiveCountsMap] = useState<Record<string, Record<string, number>>>({});
  const [cameraVehicleInOutMap, setCameraVehicleInOutMap] = useState<
    Record<string, Record<string, { in: number; out: number }>>
  >({});
  const [liveVehicleInOut, setLiveVehicleInOut] = useState<Record<string, { in: number; out: number }>>({
    CAR: { in: 0, out: 0 },
    TRUCK: { in: 0, out: 0 },
    BUS: { in: 0, out: 0 },
    MOTORCYCLE: { in: 0, out: 0 },
    PERSON: { in: 0, out: 0 },
  });
  const [liveLogs, setLiveLogs] = useState<DetectionLogEntry[]>([]);

  // Initialize unified Socket.IO connection
  useEffect(() => {
    socketClient.connect();
  }, []);

  // Modular Traffic Analytics Hook (combines MySQL DB counts + live session metrics)
  const {
    displayInCount,
    displayOutCount,
    displayActiveCount,
    displayLiveCounts,
    mergedVehicleInOut,
    dbCameraStats,
    refetch: refetchDbAnalytics,
  } = useTrafficAnalytics({
    cameraInMap,
    cameraOutMap,
    cameraActiveMap,
    cameraLiveCountsMap,
    activeCameraId,
    viewMode,
    liveVehicleInOut,
  });

  const dbSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (dbSyncTimerRef.current) {
        clearTimeout(dbSyncTimerRef.current);
      }
    };
  }, []);

  // Handle Detection Updates from any active camera feed
  const handleDetectionUpdate = useCallback(
    (camId: string, data: DetectionUpdateData) => {
      // Guard against identical updates 5x/sec that cause jitter
      setCameraInMap((prev) => (prev[camId] === data.inCount ? prev : { ...prev, [camId]: data.inCount }));
      setCameraOutMap((prev) => (prev[camId] === data.outCount ? prev : { ...prev, [camId]: data.outCount }));
      setCameraActiveMap((prev) => (prev[camId] === data.activeCount ? prev : { ...prev, [camId]: data.activeCount }));
      setCameraLiveCountsMap((prev) => {
        const oldC = prev[camId];
        const newC = data.counts;
        if (oldC && newC) {
          const oldKeys = Object.keys(oldC);
          const newKeys = Object.keys(newC);
          if (oldKeys.length === newKeys.length && oldKeys.every((k) => oldC[k] === newC[k])) {
            return prev;
          }
        }
        return { ...prev, [camId]: data.counts };
      });

      const camObj = cameras.find((c) => c.id === camId);
      const cameraName =
        camObj?.cameraName || (camId === 'default-webcam' ? 'Local Webcam / USB Camera' : `Camera #${camId.substring(0, 6)}`);
      const locationName = camObj?.location || 'Intersection';

      const newEntries: DetectionLogEntry[] = [];

      if (data.detectionEvents && data.detectionEvents.length > 0) {
        data.detectionEvents.forEach((evt) => {
          newEntries.push({
            id: `det-${camId}-${evt.id}-${evt.timestamp}`,
            cameraId: camId,
            cameraName,
            camera: { cameraName, location: locationName, lane: camObj?.lane },
            vehicleType: evt.label.toUpperCase(),
            trackId: evt.id,
            event: 'DETECTION',
            confidence: (evt as any).score || 0.94,
            count: 1,
            detectedAt: new Date(evt.timestamp).toISOString(),
          });
        });
      }

      if (data.inEvents && data.inEvents.length > 0) {
        data.inEvents.forEach((evt) => {
          const v = (evt.label || 'car').toUpperCase();
          setLiveVehicleInOut((prev) => {
            const current = (prev as any)[v] || { in: 0, out: 0 };
            return { ...prev, [v]: { ...current, in: current.in + 1 } };
          });

          setCameraVehicleInOutMap((prev) => {
            const camMap = prev[camId] || {};
            const cur = camMap[v] || { in: 0, out: 0 };
            return {
              ...prev,
              [camId]: {
                ...camMap,
                [v]: { ...cur, in: cur.in + 1 },
              },
            };
          });

          newEntries.push({
            id: `in-${camId}-${evt.id}-${evt.timestamp}`,
            cameraId: camId,
            cameraName,
            camera: { cameraName, location: locationName, lane: camObj?.lane },
            vehicleType: evt.label.toUpperCase(),
            trackId: evt.id,
            event: 'IN',
            confidence: (evt as any).score || 0.95,
            count: 1,
            detectedAt: new Date(evt.timestamp).toISOString(),
          });
        });
      }

      if (data.outEvents && data.outEvents.length > 0) {
        data.outEvents.forEach((evt) => {
          const v = (evt.label || 'car').toUpperCase();
          setLiveVehicleInOut((prev) => {
            const current = (prev as any)[v] || { in: 0, out: 0 };
            return { ...prev, [v]: { ...current, out: current.out + 1 } };
          });

          setCameraVehicleInOutMap((prev) => {
            const camMap = prev[camId] || {};
            const cur = camMap[v] || { in: 0, out: 0 };
            return {
              ...prev,
              [camId]: {
                ...camMap,
                [v]: { ...cur, out: cur.out + 1 },
              },
            };
          });

          newEntries.push({
            id: `out-${camId}-${evt.id}-${evt.timestamp}`,
            cameraId: camId,
            cameraName,
            camera: { cameraName, location: locationName, lane: camObj?.lane },
            vehicleType: evt.label.toUpperCase(),
            trackId: evt.id,
            event: 'OUT',
            confidence: (evt as any).score || 0.92,
            count: 1,
            detectedAt: new Date(evt.timestamp).toISOString(),
          });
        });
      }

      if (newEntries.length > 0) {
        setLiveLogs((prev) => {
          const ids = new Set(prev.map((l) => l.id));
          const filtered = newEntries.filter((e) => !ids.has(e.id));
          return [...filtered, ...prev].slice(0, 500);
        });

        // Debounce DB refetch so backend async writes settle cleanly without bouncing numbers
        if (dbSyncTimerRef.current) {
          clearTimeout(dbSyncTimerRef.current);
        }
        dbSyncTimerRef.current = setTimeout(() => {
          refetchDbAnalytics();
        }, 800);
      }
    },
    [cameras, refetchDbAnalytics]
  );

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '2rem' }}>
      {/* Header Navigation */}
      <Navbar
        onOpenAddCamera={() => setIsModalOpen(true)}
        activeCameraName={activeCamera.cameraName}
        isAiLoading={isAiLoading}
      />

      <main className="app-container">
        {/* Multi-Camera Header */}
        {viewMode === 'GRID' && cameras.some((c) => c.enabled !== false) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <Radio color="#059669" size={20} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Multi-Camera AI Pipeline ({cameras.filter((c) => c.enabled !== false).length} Active Feeds)
            </h2>
          </div>
        )}

        {/* Main Grid: Left CCTV Feed(s) | Right Traffic Analytics */}
        <div className="app-main-grid">
          {/* Left Column: Live CCTV Stream */}
          <div>
            {viewMode === 'GRID' ? (
              <MultiCameraGrid
                cameras={cameras}
                onDetectionUpdate={handleDetectionUpdate}
                onModelLoaded={(loaded) => setIsAiLoading(!loaded)}
              />
            ) : (
              <CameraCard
                selectedCameraUrl={activeCamera.rtspUrl}
                cameraType={activeCamera.cameraType || 'WEBCAM'}
                cameraId={activeCamera.id}
                cameraName={activeCamera.cameraName}
                location={activeCamera.location}
                lane={activeCamera.lane}
                direction={activeCamera.direction}
                onDetectionUpdate={(data) => handleDetectionUpdate(activeCamera.id, data)}
                onModelLoaded={(loaded) => setIsAiLoading(!loaded)}
              />
            )}
          </div>

          {/* Right Column: Traffic Analytics Stats */}
          <div>
            <TrafficAnalytics
              counts={displayLiveCounts}
              vehicleInOut={mergedVehicleInOut}
              inCount={displayInCount}
              outCount={displayOutCount}
              activeCount={displayActiveCount}
              cameras={cameras}
              cameraStats={dbCameraStats}
              cameraLiveVehicleInOut={cameraVehicleInOutMap}
            />
          </div>
        </div>

        {/* Bottom Section: Detection History Logs Table */}
        <DetectionHistoryTable liveLogs={liveLogs} onClearLogs={() => setLiveLogs([])} />
      </main>

      {/* Add Camera Modal */}
      <CameraFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCameraAdded={addCamera}
      />
    </div>
  );
}

export default App;
