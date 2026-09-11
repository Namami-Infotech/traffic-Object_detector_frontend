import React, { useState, useEffect } from 'react';
import { X, Camera, RefreshCw } from 'lucide-react';
import { createCamera, API_BASE_URL } from '../routes';

interface CameraFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCameraAdded: (camera: any) => void;
}

export interface VideoDeviceInfo {
  deviceId: string;
  label: string;
}

export const CameraFormModal: React.FC<CameraFormModalProps> = ({
  isOpen,
  onClose,
  onCameraAdded,
}) => {
  const [cameraName, setCameraName] = useState('');
  const [location, setLocation] = useState('');
  const [lane, setLane] = useState('Lane 1');
  const [direction, setDirection] = useState('NORTH');
  const [rtspUrl, setRtspUrl] = useState('');
  const [cameraType, setCameraType] = useState<string>('WEBCAM');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('webcam');
  const [usbDevices, setUsbDevices] = useState<VideoDeviceInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Scan available video input devices when modal opens or cameraType changes
  useEffect(() => {
    if (!isOpen) return;

    async function scanUsbDevices() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      setScanning(true);
      try {
        let devices = await navigator.mediaDevices.enumerateDevices();
        let videoInputs = devices.filter((d) => d.kind === 'videoinput');

        // Check if labels are empty
        const hasLabels = videoInputs.some((d) => d.label.length > 0);
        if (!hasLabels) {
          try {
            const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
            tempStream.getTracks().forEach((track) => track.stop());
            devices = await navigator.mediaDevices.enumerateDevices();
            videoInputs = devices.filter((d) => d.kind === 'videoinput');
          } catch (pErr) {
            console.warn('Permission not granted yet for device labels');
          }
        }

        const formatted = videoInputs.map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `USB / Camera Device ${idx + 1}`,
        }));

        setUsbDevices(formatted);
        if (formatted.length > 0 && selectedDeviceId === 'webcam') {
          setSelectedDeviceId(formatted[0].deviceId);
        }
      } catch (err) {
        console.error('Error enumerating devices:', err);
      } finally {
        setScanning(false);
      }
    }

    scanUsbDevices();
  }, [isOpen, cameraType]);

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

      const json = await createCamera({
        cameraName,
        location,
        lane,
        direction,
        rtspUrl: finalSourceUrl,
        cameraType,
      });

      if (json.success) {
        onCameraAdded(json.data);
        onClose();
        setCameraName('');
        setLocation('');
        setRtspUrl('');
      } else {
        setError(json.message || 'Failed to add camera');
      }
    } catch (err: any) {
      setError(`Backend connection error. Ensure Node server is running on ${API_BASE_URL}`);
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
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '1rem',
      }}
    >
      <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', padding: '1.4rem', position: 'relative', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Connect New CCTV Camera</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              border: '1px solid #fecaca',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
              Camera Name
            </label>
            <input
              type="text"
              placeholder="e.g. USB Phone Camera #1 / Gate CCTV"
              value={cameraName}
              onChange={(e) => setCameraName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
              Intersection / Location
            </label>
            <input
              type="text"
              placeholder="e.g. MG Road Intersection"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                Lane Name
              </label>
              <input
                type="text"
                placeholder="e.g. Lane 1"
                value={lane}
                onChange={(e) => setLane(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                Traffic Direction
              </label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              >
                <option value="NORTH">NORTH Bound</option>
                <option value="SOUTH">SOUTH Bound</option>
                <option value="EAST">EAST Bound</option>
                <option value="WEST">WEST Bound</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
              CCTV Camera Type
            </label>
            <select
              value={cameraType}
              onChange={(e: any) => setCameraType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            >
              <option value="USB_PHONE">📱 Remote Mobile Phone / Other System Live Feed (Wireless Stream)</option>
              <option value="HIKVISION">📹 Hikvision IP / Bullet / Dome CCTV Camera (RTSP)</option>
              <option value="CPPLUS_DAHUA">📹 CP Plus / Dahua IP CCTV Camera (RTSP)</option>
              <option value="DVR_ANALOG">📼 Analog DVR / NVR Multi-Channel RTSP Stream</option>
              <option value="USB_DVR_CARD">🔌 4-Channel USB DVR Capture Card / Dongle (RCA/BNC)</option>
              <option value="WIFI_SMART">🌐 Wi-Fi Smart / PTZ / Bulb CCTV Camera (ONVIF/RTSP)</option>
              <option value="SIM_4G">📡 4G SIM Outdoor Security CCTV Camera (RTSP/IP)</option>
              <option value="FILE">🎬 Local CCTV Traffic Video File (MP4/WebM)</option>
              <option value="IP_RTSP">🎥 Generic RTSP / HLS / HTTP CCTV Stream URL</option>
              <option value="WEBCAM">💻 Built-in System / Direct USB CCTV Hardware Device</option>
            </select>
          </div>

          {/* If WEBCAM or USB_DVR_CARD selected, show detected USB Device selection dropdown */}
          {(cameraType === 'WEBCAM' || cameraType === 'USB_DVR_CARD') && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Select Direct USB Hardware Device Channel
                </label>
                <span style={{ fontSize: '0.75rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <RefreshCw size={12} className={scanning ? 'spin' : ''} /> {usbDevices.length} Hardware Devices Detected
                </span>
              </div>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              >
                <option value="webcam">Default System Video Device</option>
                {usbDevices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>

              <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.78rem', color: '#166534' }}>
                🔌 <strong>CCTV Hardware Note:</strong> Analog Dongle / USB Grabber plug karne par Windows har channel (Ch 1, 2, 3, 4) ko individual USB Video Input device banata hai. Dropdown se specific Channel Device (OEM/USB Video) select karein.
              </div>
            </div>
          )}

          {cameraType !== 'WEBCAM' && cameraType !== 'USB_DVR_CARD' && (
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                CCTV Stream URL / RTSP Address
              </label>
              <input
                type="text"
                placeholder={
                  cameraType === 'HIKVISION'
                    ? 'rtsp://admin:password@192.168.1.64:554/Streaming/Channels/101'
                    : cameraType === 'CPPLUS_DAHUA'
                      ? 'rtsp://admin:password@192.168.1.250:554/cam/realmonitor?channel=1&subtype=0'
                      : cameraType === 'DVR_ANALOG'
                        ? 'rtsp://admin:password@192.168.1.10:554/Streaming/Channels/201'
                        : 'rtsp://admin:123456@192.168.1.100:554/live/ch0'
                }
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />

              {/* Helpful RTSP Hardware Guides */}
              <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.78rem', color: '#166534' }}>
                💡 <strong>CCTV RTSP Format Guide:</strong>
                {cameraType === 'HIKVISION' && ' Hikvision: rtsp://admin:password@IP:554/Streaming/Channels/101'}
                {cameraType === 'CPPLUS_DAHUA' && ' CP Plus/Dahua: rtsp://admin:password@IP:554/cam/realmonitor?channel=1&subtype=0'}
                {cameraType === 'DVR_ANALOG' && ' DVR Analog: Har channel ke liye RTSP URL me channel number change karein (Channel 101, 201, 301).'}
                {cameraType === 'WIFI_SMART' && ' Wi-Fi / PTZ Smart Camera: V380 / Smart Life app me ONVIF/RTSP enable karein.'}
                {cameraType === 'SIM_4G' && ' 4G Outdoor Camera: Public IP ya Cloud RTSP stream URL enter karein.'}
                {cameraType === 'IP_RTSP' && ' Standard RTSP format: rtsp://username:password@IP_ADDRESS:554/stream'}
                {cameraType === 'FILE' && ' CCTV Traffic Video File path enter karein ya local video choose karein.'}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              padding: '12px',
              borderRadius: '8px',
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
            }}
          >
            {loading ? 'Saving to Database...' : 'Save & Connect Camera'}
          </button>
        </form>
      </div>
    </div>
  );
};
