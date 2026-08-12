import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CctvViewer } from './components/CctvViewer';
import type { DetectionUpdateData } from './components/CctvViewer';
import { MultiCameraGrid } from './components/MultiCameraGrid';
import { TrafficAnalytics } from './components/TrafficAnalytics';
import { CameraFormModal } from './components/CameraFormModal';
import { DetectionHistoryTable } from './components/DetectionHistoryTable';
import { Radio, Grid, Layout } from 'lucide-react';

import { getCameras } from './routes';
import { socketService } from './services/socketService';

export function App() {
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
  const [viewMode, setViewMode] = useState<'GRID' | 'SINGLE'>('GRID');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(true);

  // Tracking & Analytics State per Camera ID (Isolated Camera Maps to prevent fluctuation)
  const [cameraInMap, setCameraInMap] = useState<Record<string, number>>({});
  const [cameraOutMap, setCameraOutMap] = useState<Record<string, number>>({});
  const [cameraActiveMap, setCameraActiveMap] = useState<Record<string, number>>({});
  const [cameraLiveCountsMap, setCameraLiveCountsMap] = useState<Record<string, Record<string, number>>>({});
  const [liveLogs, setLiveLogs] = useState<any[]>([]);

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
            return [...prev, ...newCams];
          });
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

    if (data.inEvents && data.inEvents.length > 0) {
      data.inEvents.forEach((evt) => {
        newEntries.push({
          id: `in-${camId}-${evt.id}-${evt.timestamp}`,
          cameraId: camId,
          cameraName: cameraName,
          camera: { cameraName: cameraName, location: locationName, lane: camObj?.lane },
          vehicleType: evt.label.toUpperCase(),
          trackId: evt.id,
          event: 'IN',
          confidence: 0.95,
          count: 1,
          detectedAt: new Date(evt.timestamp).toISOString(),
        });
      });
    }

    if (data.outEvents && data.outEvents.length > 0) {
      data.outEvents.forEach((evt) => {
        newEntries.push({
          id: `out-${camId}-${evt.id}-${evt.timestamp}`,
          cameraId: camId,
          cameraName: cameraName,
          camera: { cameraName: cameraName, location: locationName, lane: camObj?.lane },
          vehicleType: evt.label.toUpperCase(),
          trackId: evt.id,
          event: 'OUT',
          confidence: 0.92,
          count: 1,
          detectedAt: new Date(evt.timestamp).toISOString(),
        });
      });
    }

    if (newEntries.length > 0) {
      setLiveLogs((prev) => {
        const ids = new Set(prev.map((l) => l.id));
        const filtered = newEntries.filter((e) => !ids.has(e.id));
        return [...filtered, ...prev].slice(0, 50);
      });
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

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '2rem' }}>
      {/* Header Navigation */}
      <Navbar
        onOpenAddCamera={() => setIsModalOpen(true)}
        activeCameraName={activeCamera.cameraName}
        isAiLoading={isAiLoading}
      />

      <main className="app-container">
        {/* Top Control Bar: View Mode Switcher (GRID vs SINGLE) & Focus Selector */}
        <div className="glass-panel control-bar-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 500 }}>View Mode:</span>
            <button
              onClick={() => setViewMode('GRID')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: viewMode === 'GRID' ? '1px solid #10b981' : '1px solid var(--border-color)',
                background: viewMode === 'GRID' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                color: viewMode === 'GRID' ? '#34d399' : 'var(--text-secondary)',
                fontWeight: viewMode === 'GRID' ? 600 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
              }}
            >
              <Grid size={15} /> Multi-Camera Grid
            </button>

            <button
              onClick={() => setViewMode('SINGLE')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: viewMode === 'SINGLE' ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                background: viewMode === 'SINGLE' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                color: viewMode === 'SINGLE' ? '#60a5fa' : 'var(--text-secondary)',
                fontWeight: viewMode === 'SINGLE' ? 600 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
              }}
            >
              <Layout size={15} /> Single Focus View
            </button>
          </div>

          {/* Camera Selector in SINGLE mode */}
          {viewMode === 'SINGLE' && (
            <div className="camera-chips-scroll">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                <Radio size={16} color="var(--accent-blue)" />
                Focus Feed:
              </span>
              {cameras.map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => setActiveCameraId(cam.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: activeCameraId === cam.id ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                    background: activeCameraId === cam.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                    color: activeCameraId === cam.id ? '#60a5fa' : 'var(--text-secondary)',
                    fontWeight: activeCameraId === cam.id ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cam.cameraName}
                </button>
              ))}
            </div>
          )}
        </div>

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

          {/* Right Column: Traffic Analytics Stats */}
          <div>
            <TrafficAnalytics
              counts={displayLiveCounts}
              inCount={displayInCount}
              outCount={displayOutCount}
              activeCount={displayActiveCount}
            />
          </div>

        </div>

        {/* Bottom Section: Prisma MySQL Synced Database Logs */}
        <DetectionHistoryTable liveLogs={liveLogs} onClearLogs={() => setLiveLogs([])} />

      </main>

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
