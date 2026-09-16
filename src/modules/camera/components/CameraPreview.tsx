import React from 'react';
import { Maximize2, Radio, AlertCircle } from 'lucide-react';
import { DetectionCanvasOverlay } from '../../detection/components/DetectionCanvasOverlay';

export interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  remoteImgRef: React.RefObject<HTMLImageElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  hasRemoteFeed: boolean;
  isRtspStream: boolean;
  remoteImageSrc: string;
  mjpegStreamUrl?: string;
  cameraError: string | null;
  cameraIp?: string;
  isCameraRunning: boolean;
  isFullscreen: boolean;
  cameraId?: string;
  selectedCameraUrl?: string;
  onToggleFullscreen: () => void;
  onRetry: () => void;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  videoRef,
  remoteImgRef,
  canvasRef,
  hasRemoteFeed,
  isRtspStream,
  remoteImageSrc,
  mjpegStreamUrl,
  cameraError,
  cameraIp = 'Camera',
  isCameraRunning,
  isFullscreen,
  cameraId = 'default-webcam',
  selectedCameraUrl = '',
  onToggleFullscreen,
  onRetry,
}) => {
  const showRemoteImage = hasRemoteFeed || isRtspStream || Boolean(remoteImageSrc);

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, input, a')) return;
        if (isCameraRunning) {
          onToggleFullscreen();
        }
      }}
      title={
        isCameraRunning
          ? isFullscreen
            ? 'Click to Exit Fullscreen'
            : 'Click to open Full Screen'
          : ''
      }
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: isFullscreen ? undefined : '16/9',
        flex: isFullscreen ? 1 : undefined,
        minHeight: isFullscreen ? 0 : undefined,
        maxWidth: '100%',
        margin: 0,
        backgroundColor: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: isCameraRunning ? (isFullscreen ? 'default' : 'pointer') : 'default',
        boxShadow: isCameraRunning && !isFullscreen ? '0 0 0 1px rgba(16, 185, 129, 0.35)' : undefined,
        transition: 'box-shadow 0.2s ease',
      }}
    >
      {/* Local Video Stream */}
      <video
        ref={videoRef}
        crossOrigin="anonymous"
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'fill',
          display: showRemoteImage ? 'none' : 'block',
        }}
      />

      {/* Remote / RTSP Image Feed */}
      {showRemoteImage && (
        <img
          ref={remoteImgRef}
          src={remoteImageSrc || mjpegStreamUrl}
          alt="Live Camera Feed"
          crossOrigin="anonymous"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'fill',
            display: hasRemoteFeed || Boolean(remoteImageSrc) ? 'block' : 'none',
          }}
        />
      )}

      {/* Canvas Overlay for BBoxes, Trajectories & Virtual Line */}
      <DetectionCanvasOverlay ref={canvasRef} />

      {/* Fullscreen Floating Hint */}
      {isCameraRunning && !isFullscreen && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 6,
            background: 'rgba(15, 23, 42, 0.78)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '8px',
            padding: '5px 11px',
            color: '#ffffff',
            fontSize: '0.74rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <Maximize2 size={13} color="#60a5fa" />
          <span>Click for Fullscreen</span>
        </div>
      )}

      {/* Waiting for Remote Feed Placeholder */}
      {!hasRemoteFeed &&
        !remoteImageSrc &&
        cameraId !== 'default-webcam' &&
        (!selectedCameraUrl || selectedCameraUrl === 'webcam' || selectedCameraUrl === 'remote-stream') &&
        !cameraError && (
          <div
            style={{
              position: 'absolute',
              textAlign: 'center',
              padding: '1.2rem',
              color: 'var(--text-secondary)',
              zIndex: 5,
            }}
          >
            <Radio size={28} color="#60a5fa" style={{ margin: '0 auto 8px', animation: 'pulse 1.5s infinite' }} />
            <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '4px' }}>
              Waiting for Camera Feed
            </h4>
            <p style={{ fontSize: '0.78rem', maxWidth: '280px', margin: '0 auto', lineHeight: 1.4 }}>
              Check the camera stream status or connect an active CCTV/RTSP camera.
            </p>
          </div>
        )}

      {/* Waiting for RTSP Camera Stream Placeholder */}
      {!hasRemoteFeed && !remoteImageSrc && isRtspStream && !cameraError && (
        <div
          style={{
            position: 'absolute',
            textAlign: 'center',
            padding: '1.2rem',
            color: 'var(--text-secondary)',
            zIndex: 5,
          }}
        >
          <Radio size={28} color="#10b981" style={{ margin: '0 auto 8px', animation: 'pulse 1.5s infinite' }} />
          <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '4px' }}>
            Connecting to Live Camera Stream...
          </h4>
          <p style={{ fontSize: '0.78rem', maxWidth: '320px', margin: '0 auto 6px', lineHeight: 1.4 }}>
            Receiving live stream from camera (<strong>{cameraIp}</strong>).
          </p>
          <p style={{ fontSize: '0.7rem', color: '#94a3b8', maxWidth: '300px', margin: '0 auto 10px', lineHeight: 1.3 }}>
            Ensure local relay bridge is active if running on local subnet.
          </p>
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid #10b981',
              color: '#34d399',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              margin: '0 auto',
            }}
          >
            🔄 Reconnect Stream Now
          </button>
        </div>
      )}

      {/* Camera Error State Overlay */}
      {cameraError && (
        <div
          style={{
            position: 'absolute',
            background: 'rgba(15, 23, 42, 0.95)',
            padding: '1.5rem',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#ef4444',
            maxWidth: '420px',
            zIndex: 10,
          }}
        >
          <AlertCircle size={36} style={{ margin: '0 auto 8px' }} />
          <p style={{ fontWeight: 600 }}>{cameraError}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '12px' }}>
            Ensure your camera is connected and browser permission is granted.
          </p>
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid var(--accent-blue)',
              color: '#60a5fa',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Retry Camera Stream
          </button>
        </div>
      )}
    </div>
  );
};
