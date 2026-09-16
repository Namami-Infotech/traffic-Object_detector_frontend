import React, { useRef, useState, useEffect } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { Radio, MapPin, Navigation } from 'lucide-react';
import { useFullscreen } from '../hooks/useFullscreen';
import { useCameraStream } from '../hooks/useCameraStream';
import { useDetectionTracker } from '../../detection/hooks/useDetectionTracker';
import { aiModelService } from '../../detection/services/aiModelService';
import { analyticsApi } from '../../../services/api';
import { extractCameraIp } from '../utils/cameraUtils';
import { CameraPreview } from './CameraPreview';
import { CameraStatus } from './CameraStatus';
import { CameraControls } from './CameraControls';
import { VirtualLineControl } from './VirtualLineControl';
import type { CameraType, LineOrientation } from '../types/camera.types';
import type { DetectionUpdateData } from '../../detection/types/detection.types';

export interface CameraCardProps {
  selectedCameraUrl: string;
  cameraType: CameraType | string;
  cameraId?: string;
  cameraName?: string;
  location?: string;
  lane?: string;
  direction?: string;
  deviceId?: string;
  onDetectionUpdate: (data: DetectionUpdateData) => void;
  onModelLoaded?: (loaded: boolean) => void;
}

export const CameraCard: React.FC<CameraCardProps> = ({
  selectedCameraUrl,
  cameraType,
  cameraId = 'default-webcam',
  cameraName,
  location,
  lane,
  direction,
  deviceId,
  onDetectionUpdate,
  onModelLoaded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [lineOrientation, setLineOrientation] = useState<LineOrientation>('HORIZONTAL');
  const [linePositionPercent, setLinePositionPercent] = useState<number>(50);
  const [showTrajectories] = useState<boolean>(true);

  // Initial counts from DB
  const [initialIn, setInitialIn] = useState<number>(0);
  const [initialOut, setInitialOut] = useState<number>(0);
  const [initialVehicleInOut, setInitialVehicleInOut] = useState<
    Record<string, { in: number; out: number }>
  >({
    CAR: { in: 0, out: 0 },
    TRUCK: { in: 0, out: 0 },
    BUS: { in: 0, out: 0 },
    MOTORCYCLE: { in: 0, out: 0 },
    PERSON: { in: 0, out: 0 },
  });

  // Fullscreen hook
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);

  // Stream hook
  const {
    videoRef,
    remoteImgRef,
    hasRemoteFeed,
    remoteImageSrc,
    mjpegStreamUrl,
    isLocalStreamActive,
    cameraError,
    setCameraError,
    isCameraRunning,
    isRtspStream,
    retryStream,
  } = useCameraStream({
    cameraId,
    cameraName,
    selectedCameraUrl,
    cameraType,
    deviceId,
  });

  // Load TensorFlow COCO-SSD model once
  useEffect(() => {
    let isMounted = true;
    async function loadModel() {
      try {
        onModelLoaded?.(false);
        const loadedModel = await aiModelService.getModel();
        if (isMounted) {
          setModel(loadedModel);
          onModelLoaded?.(true);
        }
      } catch (err) {
        console.error('Failed to load AI model:', err);
        setCameraError('AI Model loading failed.');
      }
    }
    loadModel();
    return () => {
      isMounted = false;
    };
  }, [onModelLoaded, setCameraError]);

  // Fetch initial analytics from DB for this camera
  useEffect(() => {
    let isMounted = true;
    async function fetchDbCounts() {
      try {
        const res = await analyticsApi.getAnalytics(cameraId);
        if (isMounted && res.success && res.data) {
          setInitialIn(res.data.totalIn || 0);
          setInitialOut(res.data.totalOut || 0);
          if (res.data.vehicleInOut) {
            setInitialVehicleInOut({
              CAR: res.data.vehicleInOut.CAR || { in: 0, out: 0 },
              TRUCK: res.data.vehicleInOut.TRUCK || { in: 0, out: 0 },
              BUS: res.data.vehicleInOut.BUS || { in: 0, out: 0 },
              MOTORCYCLE: res.data.vehicleInOut.MOTORCYCLE || { in: 0, out: 0 },
              PERSON: res.data.vehicleInOut.PERSON || { in: 0, out: 0 },
            });
          }
        }
      } catch (err) {
        console.warn('Failed to load initial camera counts from DB:', err);
      }
    }
    fetchDbCounts();
    return () => {
      isMounted = false;
    };
  }, [cameraId]);

  // Detection & Tracking Hook
  const { inCount, outCount, activeVehicleCount, liveCounts, vehicleInOut } = useDetectionTracker({
    cameraId,
    model,
    videoRef,
    remoteImgRef,
    canvasRef,
    lineConfig: {
      orientation: lineOrientation,
      positionPercent: linePositionPercent,
    },
    showTrajectories,
    hasRemoteFeed,
    isLocalStreamActive,
    onDetectionUpdate,
    initialInCount: initialIn,
    initialOutCount: initialOut,
    initialVehicleInOut,
  });

  const cameraIp = extractCameraIp(selectedCameraUrl, cameraName);

  return (
    <div
      ref={containerRef}
      className="glass-panel"
      style={
        isFullscreen
          ? {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 99999,
            background: '#070b14',
            padding: '0.6rem 0.8rem',
            margin: 0,
            borderRadius: 0,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            overflow: 'hidden',
          }
          : {
            padding: '1.2rem',
            position: 'relative',
          }
      }
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.8rem',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {/* Left Side: Camera Name, Location, Lane */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio color="var(--accent-red)" size={18} />
            <h2
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                margin: 0,
                color: isFullscreen ? '#f8fafc' : 'var(--text-primary)',
              }}
            >
              {cameraName || 'CCTV Stream & Virtual Line Tracker'}
            </h2>
          </div>
          {location && (
            <span
              style={{
                fontSize: '0.75rem',
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '2px 7px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 500,
              }}
            >
              <MapPin size={12} color="#f59e0b" />
              {location}
            </span>
          )}
          {lane && (
            <span
              style={{
                fontSize: '0.75rem',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '2px 7px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 500,
              }}
            >
              <Navigation size={12} color="#10b981" />
              {lane} {direction ? `(${direction})` : ''}
            </span>
          )}
        </div>

        {/* Right Side: Status Badges & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <CameraStatus
            inCount={inCount}
            outCount={outCount}
            activeVehicleCount={activeVehicleCount}
            liveCounts={liveCounts}
            vehicleInOut={vehicleInOut}
            hasRemoteFeed={hasRemoteFeed}
            isFullscreen={isFullscreen}
          />
          <CameraControls
            isFullscreen={isFullscreen}
            isCameraRunning={isCameraRunning}
            onToggleFullscreen={toggleFullscreen}
            onReconnect={retryStream}
            showReconnect={isRtspStream}
          />
        </div>
      </div>

      {/* Virtual Line Adjuster Controls */}
      <VirtualLineControl
        orientation={lineOrientation}
        positionPercent={linePositionPercent}
        onOrientationChange={setLineOrientation}
        onPositionChange={setLinePositionPercent}
        isFullscreen={isFullscreen}
      />

      {/* Video & Canvas Stream Preview */}
      <CameraPreview
        videoRef={videoRef}
        remoteImgRef={remoteImgRef}
        canvasRef={canvasRef}
        hasRemoteFeed={hasRemoteFeed}
        isRtspStream={isRtspStream}
        remoteImageSrc={remoteImageSrc}
        mjpegStreamUrl={mjpegStreamUrl}
        cameraError={cameraError}
        cameraIp={cameraIp}
        isCameraRunning={isCameraRunning}
        isFullscreen={isFullscreen}
        cameraId={cameraId}
        selectedCameraUrl={selectedCameraUrl}
        onToggleFullscreen={toggleFullscreen}
        onRetry={retryStream}
      />
    </div>
  );
};
