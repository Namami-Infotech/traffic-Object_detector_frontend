import React, { useState, useEffect } from 'react';
import { X, Camera, RefreshCw } from 'lucide-react';
import { cameraService } from '../services/cameraService';
import type { VideoDeviceInfo } from '../types/camera.types';

export interface CameraFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCameraAdded: (camera: any) => void;
}

export const CameraFormModal: React.FC<CameraFormModalProps> = ({
  isOpen,
  onClose,
  onCameraAdded,
}) => {
  const [cameraName, setCameraName] = useState('');
  const [location, setLocation] = useState('');
  const [lane] = useState('Lane 1');
  const [direction, setDirection] = useState('NORTH');
  const [rtspUrl, setRtspUrl] = useState('');
  const [cameraType, setCameraType] = useState<string>('WEBCAM');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('webcam');
  const [usbDevices, setUsbDevices] = useState<VideoDeviceInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    async function scan() {
      setScanning(true);
      const devices = await cameraService.enumerateVideoDevices();
      setUsbDevices(devices);
      if (devices.length > 0 && selectedDeviceId === 'webcam') {
        setSelectedDeviceId(devices[0].deviceId);
      }
      setScanning(false);
    }

    scan();
  }, [isOpen, cameraType, selectedDeviceId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cameraName || !location) {
      setError('Please fill camera name and location');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const finalSourceUrl =
        cameraType === 'WEBCAM' || cameraType === 'USB_PHONE'
          ? selectedDeviceId || 'webcam'
          : rtspUrl;

      const res = await cameraService.createCamera({
        cameraName,
        location,
        lane,
        direction,
        rtspUrl: finalSourceUrl,
        cameraType,
      });

      if (res.success && res.data) {
        onCameraAdded(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to save camera to database');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while adding camera');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.2rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                background: '#eff6ff',
                padding: '8px',
                borderRadius: '8px',
                color: 'var(--accent-blue)',
              }}
            >
              <Camera size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Connect Traffic Camera
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Register and stream a CCTV, RTSP or USB device
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                color: '#b91c1c',
                padding: '0.75rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Camera Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Camera Source Type
              </label>
              <select
                value={cameraType}
                onChange={(e) => setCameraType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              >
                <option value="WEBCAM">Local Webcam</option>
                <option value="IP_RTSP">IP CCTV / RTSP Stream</option>
                {/* <option value="DROIDCAM">DroidCam / Virtual Camera</option> */}
              </select>
            </div>

            {/* Camera Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Camera Name *
              </label>
              <input
                type="text"
                placeholder="e.g. North Intersection Camera #1"
                value={cameraName}
                onChange={(e) => setCameraName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
                required
              />
            </div>

            {/* Location & Lane Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Location / Junction *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ring Road Junction"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  Direction
                </label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  <option value="NORTH">Northbound (N)</option>
                  <option value="SOUTH">Southbound (S)</option>
                  <option value="EAST">Eastbound (E)</option>
                  <option value="WEST">Westbound (W)</option>
                </select>
              </div>
            </div>

            {/* RTSP Stream URL Input (when IP_RTSP) */}
            {cameraType === 'IP_RTSP' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  RTSP Stream URL *
                </label>
                <input
                  type="text"
                  placeholder="rtsp://admin:password@192.168.1.100:554/ch1/main"
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                  required
                />
                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Format: <code>rtsp://username:password@camera_ip:554/h264Preview_01_main</code>
                </p>
              </div>
            )}

            {/* USB Device Selection */}
            {cameraType === 'WEBCAM' && usbDevices.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Detected USB / Webcams</label>
                  <button
                    type="button"
                    onClick={async () => {
                      setScanning(true);
                      const devs = await cameraService.enumerateVideoDevices();
                      setUsbDevices(devs);
                      setScanning(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-blue)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <RefreshCw size={11} className={scanning ? 'animate-spin' : ''} />
                    Rescan
                  </button>
                </div>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  {usbDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Form Submit Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: '1px solid var(--border-color)',
                padding: '9px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'var(--accent-blue)',
                border: 'none',
                color: '#ffffff',
                padding: '9px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Adding...' : 'Connect Camera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
