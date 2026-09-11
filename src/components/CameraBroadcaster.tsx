import React, { useRef, useState, useEffect } from 'react';
import { Smartphone, SwitchCamera, Play, Square, AlertCircle } from 'lucide-react';
import { socketService } from '../services/socketService';
import { getCameras, createCamera } from '../routes';

interface CameraBroadcasterProps {
  onBackToDashboard?: () => void;
}

export const CameraBroadcaster: React.FC<CameraBroadcasterProps> = ({ onBackToDashboard }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<any>(null);

  const [cameras, setCameras] = useState<any[]>([]);
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
        const json = await getCameras();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setCameras(json.data);
          // Skip the first camera (usually local webcam) — pick a DIFFERENT camera for phone broadcasting
          const nonWebcam = json.data.find((c: any) => c.id !== 'default-webcam' && c.rtspUrl !== 'webcam');
          setSelectedCameraId(nonWebcam ? nonWebcam.id : json.data[json.data.length - 1].id);
        } else {
          setCameras([{ id: 'default-webcam', cameraName: 'Camera #1 - Main Gate', location: 'Main Gate' }]);
        }
      } catch (err) {
        setCameras([{ id: 'default-webcam', cameraName: 'Camera #1 - Main Gate', location: 'Main Gate' }]);
      }
    }
    loadCams();
    socketService.connect();
  }, []);

  // Initialize Camera preview
  const startCameraPreview = async (mode: 'environment' | 'user') => {
    setError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera access requires HTTPS. Please access via https:// URL.');
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
      console.error('Camera init error:', err);
      setError('Could not access camera. Please allow camera permissions in browser settings.');
      return null;
    }
  };

  useEffect(() => {
    startCameraPreview(facingMode);
    return () => {
      stopBroadcasting();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Toggle Front / Back camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Start Live Streaming to Dashboard
  const startBroadcasting = async () => {
    let currentId = selectedCameraId;

    // If "CREATE_NEW", register new camera first
    if (selectedCameraId === 'NEW') {
      try {
        const res = await createCamera({
          cameraName: customCameraName || 'Mobile Camera Feed',
          location: customLocation || 'Street View',
          rtspUrl: 'remote-stream',
          cameraType: 'USB_PHONE',
          lane: 'Lane 1',
          direction: 'NORTH',
        });
        if (res.success && res.data) {
          currentId = res.data.id;
          setSelectedCameraId(currentId);
          setCameras((prev) => [res.data, ...prev]);
        }
      } catch (e) {
        console.warn('Could not register camera in DB, using local ID', e);
        currentId = `mobile-${Date.now()}`;
      }
    }

    setIsBroadcasting(true);
    setStatusMessage(`🔴 LIVE: Streaming as [${currentId}]`);
    setSentFrames(0);

    // Announce online to backend
    socketService.emit('camera_broadcaster_status', {
      cameraId: currentId,
      status: 'ONLINE',
      deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile Phone' : 'Remote Device',
    });

    const targetIntervalMs = Math.round(1000 / fps);

    // Frame transmission loop
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

      socketService.emit('camera_frame_broadcast', {
        cameraId: currentId,
        image: frameData,
        timestamp: Date.now(),
      });

      setSentFrames((prev) => prev + 1);
    }, targetIntervalMs);
  };

  // Stop Streaming
  const stopBroadcasting = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsBroadcasting(false);
    setStatusMessage('Broadcasting paused');

    socketService.emit('camera_broadcaster_status', {
      cameraId: selectedCameraId,
      status: 'OFFLINE',
    });
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
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid var(--border-color)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            🖥️ Dashboard
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Camera Live Preview Viewfinder */}
      <div className="glass-panel" style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', background: '#000', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Live Broadcast Badge Overlay */}
        {isBroadcasting && (
          <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(220, 38, 38, 0.9)', color: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 0 15px rgba(220, 38, 38, 0.6)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }}></span>
            LIVE TRANSMITTING ({sentFrames} frames)
          </div>
        )}

        {/* Quick Flip Camera Button */}
        <button
          onClick={handleToggleFacingMode}
          disabled={isBroadcasting}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
          }}
        >
          <SwitchCamera size={16} />
          {facingMode === 'environment' ? 'Back 📷' : 'Front 🤳'}
        </button>
      </div>

      {/* Stream Controls & Target Camera Assignment */}
      <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#ffffff' }}>
        <div>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
            🎯 Stream As Which Camera on Dashboard?
          </label>
          <select
            disabled={isBroadcasting}
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
            }}
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                📹 {c.cameraName || `Camera ${c.id}`} ({c.location || 'Intersection'})
              </option>
            ))}
            <option value="NEW">➕ Register as New Camera Feed</option>
          </select>
        </div>

        {selectedCameraId === 'NEW' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Camera Name</label>
              <input
                type="text"
                value={customCameraName}
                onChange={(e) => setCustomCameraName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Location</label>
              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        )}

        {/* Start / Stop Broadcast Action Button */}
        {!isBroadcasting ? (
          <button
            onClick={startBroadcasting}
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
            }}
          >
            <Play size={20} fill="#fff" />
            START BROADCASTING TO DASHBOARD 🔴
          </button>
        ) : (
          <button
            onClick={stopBroadcasting}
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
            }}
          >
            <Square size={20} fill="#fff" />
            STOP BROADCASTING
          </button>
        )}

        {statusMessage && (
          <p style={{ fontSize: '0.85rem', color: '#10b981', textAlign: 'center', margin: 0 }}>
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
};
