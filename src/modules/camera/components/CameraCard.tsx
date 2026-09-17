import React, { useRef, useState, useEffect } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { Radio, MapPin, Navigation, ArrowDownUp, ChevronDown, X } from 'lucide-react';
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

const CAMERA_VEHICLES = [
  { key: 'CAR', label: 'Cars', emoji: '🚗', bg: '#f0fdf4', border: '#bbf7d0', textColor: '#166534' },
  { key: 'BUS', label: 'Buses', emoji: '🚌', bg: '#fffbeb', border: '#fef08a', textColor: '#854d0e' },
  { key: 'TRUCK', label: 'Trucks', emoji: '🚚', bg: '#fef2f2', border: '#fecaca', textColor: '#991b1b' },
  { key: 'MOTORCYCLE', label: 'Motorcycles', emoji: '🏍️', bg: '#f5f3ff', border: '#e9d5ff', textColor: '#5b21b6' },
  { key: 'PERSON', label: 'Pedestrians', emoji: '🚶', bg: '#ecfeff', border: '#a5f3fc', textColor: '#155e75' },
] as const;

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
  const [lineOrientation, setLineOrientation] = useState<LineOrientation>('VERTICAL');
  const [linePositionPercent, setLinePositionPercent] = useState<number>(50);
  const [showTrajectories] = useState<boolean>(true);
  const [isInOutSliderOpen, setIsInOutSliderOpen] = useState<boolean>(false);

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
        {/* Left Side: Camera Name & Location */}
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
        </div>

        {/* Right Side: Action Controls (Reconnect, Full Screen) */}
        <CameraControls
          isFullscreen={isFullscreen}
          isCameraRunning={isCameraRunning}
          onToggleFullscreen={toggleFullscreen}
          onReconnect={retryStream}
          showReconnect={isRtspStream}
        />
      </div>

      {/* Camera Live Metrics & Navigation Bar (Directly Above Camera Feed) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: isInOutSliderOpen ? '0.35rem' : '0.65rem',
          padding: '5px 10px',
          background: isFullscreen ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
          borderRadius: '8px',
          border: isFullscreen ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid var(--border-color)',
          transition: 'margin-bottom 0.25s ease',
        }}
      >
        {/* Left Side: Compass Badge + View IN/OUT Slider Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#059669',
              background: isFullscreen ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              padding: '3px 8px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
            title="Camera Lane & Compass Direction"
          >
            <Navigation size={13} color="#10b981" />
            {lane || 'Lane 1'} {direction ? `(${direction})` : ''}
          </span>

          <button
            type="button"
            onClick={() => setIsInOutSliderOpen((prev) => !prev)}
            style={{
              fontSize: '0.74rem',
              background: isInOutSliderOpen
                ? 'rgba(59, 130, 246, 0.2)'
                : (isFullscreen ? 'rgba(255, 255, 255, 0.08)' : '#eff6ff'),
              color: isFullscreen && !isInOutSliderOpen ? '#cbd5e1' : '#2563eb',
              border: isInOutSliderOpen ? '1px solid #3b82f6' : '1px solid #bfdbfe',
              padding: '3px 9px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title={isInOutSliderOpen ? 'Close IN/OUT Slider' : 'View IN/OUT Slider'}
          >
            <ArrowDownUp size={13} color={isInOutSliderOpen ? '#2563eb' : '#3b82f6'} />
            <span>View IN/OUT</span>
            <ChevronDown
              size={13}
              style={{
                transform: isInOutSliderOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s ease',
              }}
            />
          </button>
        </div>

        {/* Right Side: Live Metrics Badges (IN/OUT, Net Occ, Active, Live) */}
        <CameraStatus
          inCount={inCount}
          outCount={outCount}
          activeVehicleCount={activeVehicleCount}
          liveCounts={liveCounts}
          vehicleInOut={vehicleInOut}
          hasRemoteFeed={hasRemoteFeed}
          isFullscreen={isFullscreen}
        />
      </div>

      {/* Sliding IN/OUT Breakdown Slider Panel */}
      <div
        style={{
          maxHeight: isInOutSliderOpen ? '200px' : '0px',
          opacity: isInOutSliderOpen ? 1 : 0,
          transform: isInOutSliderOpen ? 'translateY(0)' : 'translateY(-6px)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          marginBottom: isInOutSliderOpen ? '0.65rem' : '0px',
          pointerEvents: isInOutSliderOpen ? 'auto' : 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
            padding: '7px 10px',
            background: isFullscreen ? 'rgba(15, 23, 42, 0.85)' : '#ffffff',
            borderRadius: '8px',
            border: isFullscreen ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid #e2e8f0',
            boxShadow: '0 3px 10px rgba(0, 0, 0, 0.05)',
          }}
        >
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: isFullscreen ? '#94a3b8' : '#64748b',
              marginRight: '2px',
            }}
          >
            Vehicle Breakdown:
          </span>

          {CAMERA_VEHICLES.map(({ key, label, emoji, bg, border, textColor }) => {
            const countData = vehicleInOut[key] || { in: 0, out: 0 };
            return (
              <span
                key={key}
                style={{
                  fontSize: '0.72rem',
                  background: isFullscreen ? 'rgba(255, 255, 255, 0.08)' : bg,
                  border: `1px solid ${isFullscreen ? 'rgba(255, 255, 255, 0.18)' : border}`,
                  color: isFullscreen ? '#f1f5f9' : textColor,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
                title={`${label}: IN ${countData.in} | OUT ${countData.out}`}
              >
                <span>{emoji}</span>
                <span style={{ opacity: 0.9 }}>{label}:</span>
                <strong style={{ color: '#059669' }}>IN {countData.in}</strong>
                <span style={{ color: 'var(--text-muted)', opacity: 0.4 }}>|</span>
                <strong style={{ color: '#dc2626' }}>OUT {countData.out}</strong>
              </span>
            );
          })}

          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsInOutSliderOpen(false)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isFullscreen ? '#94a3b8' : '#64748b',
              padding: '3px 6px',
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '4px',
            }}
            title="Close slider"
          >
            <X size={14} />
          </button>
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
