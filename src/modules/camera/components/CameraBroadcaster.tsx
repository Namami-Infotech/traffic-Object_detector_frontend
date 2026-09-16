import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Smartphone, SwitchCamera, Play, Square, AlertCircle } from 'lucide-react';
import { socketClient } from '../../../services/socket/socketClient';
import { SOCKET_EVENTS } from '../../../services/socket/socketEvents';
import { cameraService } from '../services/cameraService';
import type { CameraItem } from '../types/camera.types';

export interface CameraBroadcasterProps {
  onBackToDashboard?: () => void;
}

export const CameraBroadcaster: React.FC<CameraBroadcasterProps> = ({ onBackToDashboard }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<any>(null);

  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('default-webcam');
  const [customCameraName, setCustomCameraName] = useState<string>('Phone Camera #1');
  const [customLocation, setCustomLocation] = useState<string>('North Gate');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [fps] = useState<number>(10);
  const [sentFrames, setSentFrames] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Load existing cameras list from backend
  useEffect(() => {
    async function loadCams() {
      try {
        const data = await cameraService.getAllCameras();
        if (Array.isArray(data) && data.length > 0) {
          setCameras(data as CameraItem[]);
          const nonWebcam = data.find((c) => c.id !== 'default-webcam' && c.rtspUrl !== 'webcam');
          setSelectedCameraId(nonWebcam ? nonWebcam.id : data[data.length - 1].id);
        } else {
          setCameras([{ id: 'default-webcam', cameraName: 'Camera #1 - Main Gate', location: 'Main Gate', rtspUrl: 'webcam' }]);
        }
      } catch (err) {
        setCameras([{ id: 'default-webcam', cameraName: 'Camera #1 - Main Gate', location: 'Main Gate', rtspUrl: 'webcam' }]);
      }
    }
    loadCams();
    socketClient.connect();
  }, []);

  // Initialize Camera preview
  const startCameraPreview = async (mode: 'environment' | 'user') => {
    setError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera access requires HTTPS or localhost. Please allow camera permissions in browser.');
      return null;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return stream;
    } catch (err: any) {
      console.warn('Camera init error:', err);
      setError('Could not access camera. Please allow camera permissions in browser settings.');
      return null;
    }
  };

  // Stop Streaming
  const stopBroadcasting = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsBroadcasting(false);
    setStatusMessage('Broadcasting paused');

    socketClient.emit(SOCKET_EVENTS.CAMERA_BROADCASTER_STATUS, {
      cameraId: selectedCameraId,
      status: 'OFFLINE',
    });
  }, [selectedCameraId]);

  useEffect(() => {
    startCameraPreview(facingMode);
    return () => {
      stopBroadcasting();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, stopBroadcasting]);

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Start Live Streaming to Dashboard
  const startBroadcasting = async () => {
    let currentId = selectedCameraId;

    if (selectedCameraId === 'NEW') {
      try {
        const res = await cameraService.createCamera({
          cameraName: customCameraName || 'Mobile Camera Feed',
          location: customLocation || 'Street View',
          rtspUrl: 'remote-stream',
          cameraType: 'USB_PHONE',
          lane: 'Lane 1',
          direction: 'NORTH',
        });
        if (res.success && res.data) {
          const createdCam = res.data as CameraItem;
          currentId = createdCam.id;
          setSelectedCameraId(currentId);
          setCameras((prev) => [createdCam, ...prev]);
        }
      } catch {
        currentId = `mobile-${Date.now()}`;
      }
    }

    setIsBroadcasting(true);
    setStatusMessage(`🔴 LIVE: Streaming as [${currentId}]`);
    setSentFrames(0);

    socketClient.emit(SOCKET_EVENTS.CAMERA_BROADCASTER_STATUS, {
      cameraId: currentId,
      status: 'ONLINE',
      deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile Phone' : 'Remote Device',
    });

    const targetIntervalMs = Math.round(1000 / fps);

    intervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 480;
      canvas.height = 360;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const frameData = canvas.toDataURL('image/jpeg', 0.5);

      socketClient.emit(SOCKET_EVENTS.CAMERA_FRAME_BROADCAST, {
        cameraId: currentId,
        image: frameData,
        timestamp: Date.now(),
      });

      setSentFrames((prev) => prev + 1);
    }, targetIntervalMs);
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '10px', borderRadius: '12px' }}>
            <Smartphone size={24} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Mobile Camera Broadcaster</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Stream this device's camera live to the Traffic Dashboard
            </p>
          </div>
        </div>

        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            style={{
              background: 'rgba(15, 23, 42, 0.08)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '0.8rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Video Preview with Flip Button */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Floating Flip Camera button */}
        <button
          onClick={handleToggleFacingMode}
          title="Switch between front and back camera"
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          <SwitchCamera size={16} />
          <span>{facingMode === 'environment' ? 'Back' : 'Front'} Camera</span>
        </button>

        {isBroadcasting && (
          <div style={{ position: 'absolute', top: '12px', left: '12px', background: '#dc2626', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff', animation: 'pulse 1s infinite' }} />
            LIVE • {sentFrames} Frames
          </div>
        )}
      </div>

      {/* Broadcaster Configuration Controls */}
      <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
            Target Dashboard Camera Slot
          </label>
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            disabled={isBroadcasting}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', outline: 'none', background: '#fff' }}
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.cameraName} ({c.location}) [{c.id.substring(0, 8)}]
              </option>
            ))}
            <option value="NEW">+ Register as New Mobile Camera Feed</option>
          </select>
        </div>

        {selectedCameraId === 'NEW' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Name</label>
              <input
                type="text"
                value={customCameraName}
                onChange={(e) => setCustomCameraName(e.target.value)}
                placeholder="Phone Camera #1"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Location</label>
              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="Gate #2"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        )}

        {/* Start / Stop Broadcast Button */}
        <div>
          {!isBroadcasting ? (
            <button
              onClick={startBroadcasting}
              style={{
                width: '100%',
                background: '#059669',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
              }}
            >
              <Play size={18} />
              Start Broadcasting Live
            </button>
          ) : (
            <button
              onClick={stopBroadcasting}
              style={{
                width: '100%',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                padding: '12px',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
              }}
            >
              <Square size={18} />
              Stop Broadcasting
            </button>
          )}

          {statusMessage && (
            <p style={{ textAlign: 'center', fontSize: '0.82rem', marginTop: '8px', color: isBroadcasting ? '#059669' : 'var(--text-secondary)', fontWeight: 600 }}>
              {statusMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
