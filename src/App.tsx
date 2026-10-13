import { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { CameraFormModal } from './modules/camera/components/CameraFormModal';
import { useCameraList } from './modules/camera/hooks/useCameraList';
import { useTrafficAnalytics } from './modules/analytics/hooks/useTrafficAnalytics';
import { PlateScannerModal } from './modules/detection/components/PlateScannerModal';
import type { DetectionUpdateData, DetectionLogEntry } from './modules/detection/types/detection.types';
import { LoginModal, LoginPage, RoleAccessModal, useAuth } from './modules/auth';
import { ModuleViews } from './modules/views/ModuleViews';
import { socketClient } from './services/socket/socketClient';

export function App() {
  const { isAuthenticated, moduleAccess } = useAuth();
  const [activeModule, setActiveModule] = useState<string>('cctv');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [viewMode] = useState<'GRID' | 'SINGLE'>('GRID');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isPlateModalOpen, setIsPlateModalOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
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

  // Initialize unified Socket.IO connection only when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      socketClient.connect();
    }
  }, [isAuthenticated]);

  // Synchronize active module with user's available permissions
  useEffect(() => {
    if (moduleAccess && moduleAccess.length > 0) {
      const hasCurrent = moduleAccess.some((m) => m.moduleId === activeModule);
      if (!hasCurrent) {
        setActiveModule(moduleAccess[0].moduleId);
      }
    }
  }, [moduleAccess, activeModule]);

  // Modular Traffic Analytics Hook (combines MySQL DB counts + live session metrics)
  const {
    displayInCount,
    displayOutCount,
    displayActiveCount,
    displayTotalDetections,
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
            plateNumber: (evt as any).plateNumber,
            plateConfidence: (evt as any).plateConfidence,
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
            plateNumber: (evt as any).plateNumber,
            plateConfidence: (evt as any).plateConfidence,
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
            plateNumber: (evt as any).plateNumber,
            plateConfidence: (evt as any).plateConfidence,
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

  // 1. LOGIN PAGE OPENS FIRST BEFORE ENTERING APPLICATION
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // 2. AUTHENTICATED DASHBOARD WITH ROLE-TAILORED SIDEBAR
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'var(--bg-body)' }}>
      {/* RBAC Sidebar showing only allowed modules */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Pane */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Fixed Header Navigation */}
        <div style={{ flexShrink: 0, zIndex: 30, background: 'var(--bg-body)' }}>
          <Navbar
            onOpenAddCamera={() => setIsModalOpen(true)}
            onOpenPlateScanner={() => setIsPlateModalOpen(true)}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onOpenRoleAccess={() => setIsRoleModalOpen(true)}
            activeCameraName={activeCamera.cameraName}
            isAiLoading={isAiLoading}
          />
        </div>

        {/* Scrollable Content Pane */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <main className="app-container" style={{ paddingBottom: '2.5rem' }}>
            <ModuleViews
              moduleId={activeModule}
              cameras={cameras}
              activeCamera={activeCamera}
              viewMode={viewMode}
              handleDetectionUpdate={handleDetectionUpdate}
              setIsAiLoading={setIsAiLoading}
              displayLiveCounts={displayLiveCounts}
              mergedVehicleInOut={mergedVehicleInOut}
              displayInCount={displayInCount}
              displayOutCount={displayOutCount}
              displayActiveCount={displayActiveCount}
              displayTotalDetections={displayTotalDetections}
              dbCameraStats={dbCameraStats}
              cameraVehicleInOutMap={cameraVehicleInOutMap}
              liveLogs={liveLogs}
              onClearLogs={() => {
                setLiveLogs([]);
                refetchDbAnalytics();
              }}
              onOpenPlateScanner={() => setIsPlateModalOpen(true)}
              onOpenAddCamera={() => setIsModalOpen(true)}
            />
          </main>
        </div>
      </div>

      {/* Add Camera Modal */}
      <CameraFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCameraAdded={addCamera}
      />

      {/* ANPR License Plate Scanner Modal */}
      <PlateScannerModal
        isOpen={isPlateModalOpen}
        onClose={() => setIsPlateModalOpen(false)}
        onPlateSaved={(plate, details) => {
          refetchDbAnalytics();
          const evt = details?.event || 'DETECTION';
          const vType = (details?.vehicleType || 'CAR').toUpperCase();
          const camId = activeCameraId || 'default-webcam';
          if (evt === 'IN') {
            setCameraInMap((prev) => ({ ...prev, [camId]: (prev[camId] || 0) + 1 }));
            setLiveVehicleInOut((prev) => {
              const current = prev[vType] || { in: 0, out: 0 };
              return { ...prev, [vType]: { ...current, in: current.in + 1 } };
            });
          } else if (evt === 'OUT') {
            setCameraOutMap((prev) => ({ ...prev, [camId]: (prev[camId] || 0) + 1 }));
            setLiveVehicleInOut((prev) => {
              const current = prev[vType] || { in: 0, out: 0 };
              return { ...prev, [vType]: { ...current, out: current.out + 1 } };
            });
          }
          const camObj = cameras.find((c) => c.id === camId);
          const cameraName = camObj?.cameraName || 'Plate Scanner (ANPR)';
          const locationName = camObj?.location || 'Intersection';
          const newEntry: DetectionLogEntry = {
            id: (details as any)?.dbId || `scan-${camId}-${Date.now()}`,
            cameraId: camId,
            cameraName,
            camera: { cameraName, location: locationName, lane: camObj?.lane },
            vehicleType: vType,
            plateNumber: plate,
            plateConfidence: (details as any)?.confidence || 0.95,
            event: evt,
            confidence: (details as any)?.confidence || 0.95,
            count: 1,
            detectedAt: new Date().toISOString(),
          };
          setLiveLogs((prev) => [newEntry, ...prev]);
        }}
        activeCameraId={activeCameraId}
      />

      {/* Admin Login Modal (Accessible from Navbar if needed) */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => setIsRoleModalOpen(true)}
      />

      {/* User Role & JSON Module Access Inspector */}
      <RoleAccessModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />
    </div>
  );
}

export default App;
