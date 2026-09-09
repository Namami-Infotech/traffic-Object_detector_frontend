import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CctvViewer } from './components/CctvViewer';
import type { DetectionUpdateData } from './components/CctvViewer';
import { MultiCameraGrid } from './components/MultiCameraGrid';
import { TrafficAnalytics } from './components/TrafficAnalytics';
import { CameraFormModal } from './components/CameraFormModal';
import { DetectionHistoryTable } from './components/DetectionHistoryTable';
import { CameraBroadcaster } from './components/CameraBroadcaster';
import { getCameras, getAnalytics } from './routes';
import { socketService } from './services/socketService';

export function App() {
  const [appMode, setAppMode] = useState<'DASHBOARD' | 'BROADCASTER'>('DASHBOARD');
  const [cameras, setCameras] = useState<any[]>([
    {
      id: 'default-webcam',
      cameraName: 'Local Webcam / USB Camera',
      location: 'Main Gate Intersection',
      rtspUrl: 'webcam',
      cameraType: 'WEBCAM',
      lane: 'Lane 1',
      direction: 'NORTH',
      enabled: true,
    },
  ]);

  const [activeCameraId, setActiveCameraId] = useState<string>('default-webcam');
  const [viewMode] = useState<'GRID' | 'SINGLE'>('GRID');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(true);

  // Tracking & Analytics State per Camera ID (Isolated Camera Maps to prevent fluctuation)
  const [cameraInMap, setCameraInMap] = useState<Record<string, number>>({});
  const [cameraOutMap, setCameraOutMap] = useState<Record<string, number>>({});
  const [cameraActiveMap, setCameraActiveMap] = useState<Record<string, number>>({});
  const [cameraLiveCountsMap, setCameraLiveCountsMap] = useState<Record<string, Record<string, number>>>({});
  const [liveLogs, setLiveLogs] = useState<any[]>([]);

  // Global All-Cameras DB Synced Totals for CAR, TRUCK, BUS, MOTORCYCLE, IN, OUT
  const [dbGlobalTotals, setDbGlobalTotals] = useState<{
    totalIn: number;
    totalOut: number;
    summary: Record<string, number>;
  }>({
    totalIn: 0,
    totalOut: 0,
    summary: { CAR: 0, TRUCK: 0, BUS: 0, MOTORCYCLE: 0 },
  });

  const [dbGlobalVehicleInOut, setDbGlobalVehicleInOut] = useState<
    Record<string, { in: number; out: number; total?: number }>
  >({
    CAR: { in: 0, out: 0 },
    TRUCK: { in: 0, out: 0 },
    BUS: { in: 0, out: 0 },
    MOTORCYCLE: { in: 0, out: 0 },
    PERSON: { in: 0, out: 0 },
  });

  const [liveVehicleInOut, setLiveVehicleInOut] = useState<
    Record<string, { in: number; out: number }>
  >({
    CAR: { in: 0, out: 0 },
    TRUCK: { in: 0, out: 0 },
    BUS: { in: 0, out: 0 },
    MOTORCYCLE: { in: 0, out: 0 },
    PERSON: { in: 0, out: 0 },
  });

  const fetchGlobalDbAnalytics = async () => {
    try {
      const res = await getAnalytics();
      if (res.success && res.data) {
        setDbGlobalTotals({
          totalIn: res.data.totalIn || 0,
          totalOut: res.data.totalOut || 0,
          summary: res.data.summary || {},
        });
        if (res.data.vehicleInOut) {
          setDbGlobalVehicleInOut(res.data.vehicleInOut);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch global DB analytics:', err);
    }
  };

  useEffect(() => {
    fetchGlobalDbAnalytics();
    const interval = setInterval(fetchGlobalDbAnalytics, 3000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    socketService.connect();
    return () => {
      // Keep socket open
    };
  }, []);

  // Fetch registered cameras from Node.js Express backend once on mount
  useEffect(() => {
    async function fetchRegisteredCameras() {
      try {
        const json = await getCameras();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setCameras((prev) => {
            const ids = new Set(prev.map((c) => c.id));
            const newCams = json.data.filter((c: any) => !ids.has(c.id));
            const combined = [...newCams, ...prev];
            return combined;
          });
          const ipCam = json.data.find((c: any) => c.rtspUrl && c.rtspUrl.includes('192.168.1.23'));
          if (ipCam) {
            setActiveCameraId(ipCam.id);
          }
        }
      } catch (err) {
        console.log('Backend server using local camera defaults.');
      }
    }

    fetchRegisteredCameras();
  }, []);

  const activeCamera = cameras.find((c) => c.id === activeCameraId) || cameras[0];

  const handleCameraAdded = (newCam: any) => {
    setCameras((prev) => [newCam, ...prev]);
    setActiveCameraId(newCam.id);
  };

  const handleDetectionUpdate = (camId: string, data: DetectionUpdateData) => {
    // Store metrics in camera-isolated maps (prevents multi-camera fluctuation)
    setCameraInMap((prev) => ({ ...prev, [camId]: data.inCount }));
    setCameraOutMap((prev) => ({ ...prev, [camId]: data.outCount }));
    setCameraActiveMap((prev) => ({ ...prev, [camId]: data.activeCount }));
    setCameraLiveCountsMap((prev) => ({ ...prev, [camId]: data.counts }));

    const camObj = cameras.find((c) => c.id === camId);
    const cameraName = camObj?.cameraName || (camId === 'default-webcam' ? 'Local Webcam / USB Camera' : `Camera #${camId.substring(0, 6)}`);
    const locationName = camObj?.location || 'Intersection';

    const newEntries: any[] = [];

    if (data.detectionEvents && data.detectionEvents.length > 0) {
      data.detectionEvents.forEach((evt) => {
        newEntries.push({
          id: `det-${camId}-${evt.id}-${evt.timestamp}`,
          cameraId: camId,
          cameraName: cameraName,
          camera: { cameraName: cameraName, location: locationName, lane: camObj?.lane },
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
          return {
            ...prev,
            [v]: { ...current, in: current.in + 1 },
          };
        });

        newEntries.push({
          id: `in-${camId}-${evt.id}-${evt.timestamp}`,
          cameraId: camId,
          cameraName: cameraName,
          camera: { cameraName: cameraName, location: locationName, lane: camObj?.lane },
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
          return {
            ...prev,
            [v]: { ...current, out: current.out + 1 },
          };
        });

        newEntries.push({
          id: `out-${camId}-${evt.id}-${evt.timestamp}`,
          cameraId: camId,
          cameraName: cameraName,
          camera: { cameraName: cameraName, location: locationName, lane: camObj?.lane },
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
      fetchGlobalDbAnalytics();
      setTimeout(fetchGlobalDbAnalytics, 600);
      setTimeout(fetchGlobalDbAnalytics, 1500);
    }
  };

  // Compute aggregated display metrics depending on viewMode (SINGLE focus camera vs GRID multi-camera aggregate)
  let displayInCount = 0;
  let displayOutCount = 0;
  let displayActiveCount = 0;
  let displayLiveCounts: Record<string, number> = {};

  if (viewMode === 'SINGLE') {
    displayInCount = cameraInMap[activeCameraId] || 0;
    displayOutCount = cameraOutMap[activeCameraId] || 0;
    displayActiveCount = cameraActiveMap[activeCameraId] || 0;
    displayLiveCounts = cameraLiveCountsMap[activeCameraId] || {};
  } else {
    // GRID View Mode: Sum across all active running cameras cleanly without state-clobbering fluctuation
    displayInCount = Object.values(cameraInMap).reduce((acc, val) => acc + (val || 0), 0);
    displayOutCount = Object.values(cameraOutMap).reduce((acc, val) => acc + (val || 0), 0);
    displayActiveCount = Object.values(cameraActiveMap).reduce((acc, val) => acc + (val || 0), 0);

    const aggregatedClassCounts: Record<string, number> = {};
    Object.values(cameraLiveCountsMap).forEach((cMap) => {
      Object.entries(cMap || {}).forEach(([cls, cnt]) => {
        aggregatedClassCounts[cls] = (aggregatedClassCounts[cls] || 0) + (cnt || 0);
      });
    });
    displayLiveCounts = aggregatedClassCounts;
  }

  // Real-time merged vehicle IN / OUT: combines saved MySQL counts with instant live session counts
  const mergedVehicleInOut: Record<string, { in: number; out: number; total?: number }> = {
    CAR: {
      in: Math.max(dbGlobalVehicleInOut.CAR?.in || 0, liveVehicleInOut.CAR?.in || 0),
      out: Math.max(dbGlobalVehicleInOut.CAR?.out || 0, liveVehicleInOut.CAR?.out || 0),
    },
    TRUCK: {
      in: Math.max(dbGlobalVehicleInOut.TRUCK?.in || 0, liveVehicleInOut.TRUCK?.in || 0),
      out: Math.max(dbGlobalVehicleInOut.TRUCK?.out || 0, liveVehicleInOut.TRUCK?.out || 0),
    },
    BUS: {
      in: Math.max(dbGlobalVehicleInOut.BUS?.in || 0, liveVehicleInOut.BUS?.in || 0),
      out: Math.max(dbGlobalVehicleInOut.BUS?.out || 0, liveVehicleInOut.BUS?.out || 0),
    },
    MOTORCYCLE: {
      in: Math.max(dbGlobalVehicleInOut.MOTORCYCLE?.in || 0, liveVehicleInOut.MOTORCYCLE?.in || 0),
      out: Math.max(dbGlobalVehicleInOut.MOTORCYCLE?.out || 0, liveVehicleInOut.MOTORCYCLE?.out || 0),
    },
    PERSON: {
      in: Math.max(dbGlobalVehicleInOut.PERSON?.in || 0, liveVehicleInOut.PERSON?.in || 0),
      out: Math.max(dbGlobalVehicleInOut.PERSON?.out || 0, liveVehicleInOut.PERSON?.out || 0),
    },
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '2rem' }}>
      {/* Header Navigation */}
      <Navbar
        onOpenAddCamera={() => setIsModalOpen(true)}
        activeCameraName={activeCamera.cameraName}
        isAiLoading={isAiLoading}
        appMode={appMode}
        onToggleAppMode={(mode) => setAppMode(mode)}
      />

      {appMode === 'BROADCASTER' ? (
        <main className="app-container" style={{ marginTop: '1.5rem' }}>
          <CameraBroadcaster onBackToDashboard={() => setAppMode('DASHBOARD')} />
        </main>
      ) : (
        <main className="app-container">
          {/* Top Control Bar: View Mode Switcher (GRID vs SINGLE) & Focus Selector */}
          

          {/* Responsive Grid: Left (CCTV Video Stream Grid / Single) | Right (Realtime Analytics) */}
          <div className="app-main-grid">

            {/* Left Column: Live CCTV Feed(s) */}
            <div>
              {viewMode === 'GRID' ? (
                <MultiCameraGrid
                  cameras={cameras}
                  onDetectionUpdate={(camId, data) => handleDetectionUpdate(camId, data)}
                  onModelLoaded={(loaded) => setIsAiLoading(!loaded)}
                />
              ) : (
                <CctvViewer
                  selectedCameraUrl={activeCamera.rtspUrl}
                  cameraType={activeCamera.cameraType || 'WEBCAM'}
                  cameraId={activeCamera.id}
                  onDetectionUpdate={(data) => handleDetectionUpdate(activeCamera.id, data)}
                  onModelLoaded={(loaded) => setIsAiLoading(!loaded)}
                />
              )}
            </div>

            {/* Right Column: Traffic Analytics Stats (All Cameras combined from MySQL DB) */}
            <div>
              <TrafficAnalytics
                counts={{ ...displayLiveCounts, ...dbGlobalTotals.summary }}
                vehicleInOut={mergedVehicleInOut}
                inCount={Math.max(displayInCount, dbGlobalTotals.totalIn)}
                outCount={Math.max(displayOutCount, dbGlobalTotals.totalOut)}
                activeCount={displayActiveCount}
              />
            </div>

          </div>

          {/* Bottom Section: Prisma MySQL Synced Database Logs */}
          <DetectionHistoryTable liveLogs={liveLogs} onClearLogs={() => setLiveLogs([])} />

        </main>
      )}

      {/* Add Camera Modal Form */}
      <CameraFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCameraAdded={handleCameraAdded}
      />
    </div>
  );
}

export default App;

