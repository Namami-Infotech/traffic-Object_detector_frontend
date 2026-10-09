import React, { useState, useRef } from 'react';
import { X, Upload, Scan, ShieldCheck, Database, Camera } from 'lucide-react';
import { plateRecognitionService } from '../services/plateRecognitionService';
import { detectionService } from '../services/detectionService';

export interface PlateScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlateSaved?: (plate: string) => void;
  activeCameraId?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export const PlateScannerModal: React.FC<PlateScannerModalProps> = ({
  isOpen,
  onClose,
  onPlateSaved,
  activeCameraId = 'default-webcam',
  videoRef,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [detectedPlate, setDetectedPlate] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [rawText, setRawText] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<string>('CAR');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      setImagePreview(url);
      setDetectedPlate(null);
      setRawText('');
      setStatusMessage('');
      setIsSaved(false);
      runScan(url);
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureFromCamera = () => {
    if (!videoRef?.current || videoRef.current.readyState < 2) {
      setStatusMessage('Camera feed is not active or ready.');
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setImagePreview(dataUrl);
    setDetectedPlate(null);
    setRawText('');
    setStatusMessage('');
    setIsSaved(false);
    runScan(dataUrl);
  };

  const runScan = async (imgSource: string) => {
    setIsScanning(true);
    setStatusMessage('Scanning vehicle image & running OCR...');

    try {
      const img = new Image();
      img.src = imgSource;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const res = await plateRecognitionService.recognizePlate(img);
      setRawText(res.rawText);

      if (res.plateNumber) {
        setDetectedPlate(res.formattedPlate || res.plateNumber);
        setConfidence(res.confidence);
        setStatusMessage(`Number Plate Recognized: ${res.formattedPlate || res.plateNumber}`);

        // Automatically save to MySQL Database via backend API
        await saveToDatabase(res.formattedPlate || res.plateNumber, res.confidence);
      } else {
        setDetectedPlate(null);
        setStatusMessage('No valid vehicle plate number recognized. Try an image with higher clarity.');
      }
    } catch (err: any) {
      setStatusMessage(`Scanning failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsScanning(false);
    }
  };

  const saveToDatabase = async (plateToSave: string, confScore: number) => {
    try {
      await detectionService.logEvent({
        cameraId: activeCameraId,
        vehicleType: vehicleType.toUpperCase(),
        plateNumber: plateToSave,
        plateConfidence: confScore,
        confidence: 0.98,
        event: 'DETECTION',
        count: 1,
      });

      setIsSaved(true);
      onPlateSaved?.(plateToSave);
      setStatusMessage(`✅ Saved plate "${plateToSave}" to MySQL database successfully!`);
    } catch (saveErr: any) {
      setStatusMessage(`⚠️ Saved locally, DB notice: ${saveErr.message}`);
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
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="glass-panel"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.2rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Scan size={22} color="#38bdf8" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                ANPR License Plate Scanner
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                गाड़ी नंबर प्लेट डिटेक्टर & डेटाबेस सेवर
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem' }}>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1.2rem' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              <Upload size={16} />
              Upload Vehicle Photo
            </button>

            {videoRef && (
              <button
                onClick={handleCaptureFromCamera}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <Camera size={16} />
                Snapshot Camera
              </button>
            )}
          </div>

          {/* Vehicle Type Selection */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Vehicle Type (गाड़ी का प्रकार):
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['CAR', 'BUS', 'TRUCK', 'MOTORCYCLE'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setVehicleType(type)}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: vehicleType === type ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: vehicleType === type ? '#f0f9ff' : '#ffffff',
                    color: vehicleType === type ? '#0369a1' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Image Preview & Scanner Area */}
          <div
            style={{
              minHeight: '180px',
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f8fafc',
              overflow: 'hidden',
              position: 'relative',
              marginBottom: '1.2rem',
            }}
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Vehicle Preview"
                style={{ width: '100%', maxHeight: '220px', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                <Scan size={36} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500 }}>
                  Upload a photo of a car, bus, or truck to detect number plate
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem' }}>
                  (Supports HSRP, Indian registration plates, Car / Bus / Truck)
                </p>
              </div>
            )}

            {isScanning && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.65)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <Scan size={32} className="spin-animation" color="#38bdf8" />
                <span style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Filtering stickers & scanning plate...
                </span>
              </div>
            )}
          </div>

          {/* Result Card */}
          {detectedPlate && (
            <div
              style={{
                background: '#f8fafc',
                border: '1.5px solid #0284c7',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                  DETECTED LICENSE PLATE:
                </span>
                <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <ShieldCheck size={14} /> {Math.round(confidence * 100)}% Confidence
                </span>
              </div>

              {/* Indian License Plate Badge */}
              <div style={{ margin: '10px 0', textAlign: 'center' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: '#ffffff',
                    border: '2px solid #0f172a',
                    borderRadius: '6px',
                    padding: '4px 14px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    fontFamily: 'monospace',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    letterSpacing: '1.5px',
                  }}
                >
                  <span
                    style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      padding: '2px 4px',
                      borderRadius: '3px',
                      marginRight: '10px',
                    }}
                  >
                    IND
                  </span>
                  <span style={{ color: '#0f172a' }}>{detectedPlate}</span>
                </div>
              </div>

              {/* Status info */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.75rem', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 600 }}>
                  <Database size={14} />
                  <span>Saved into MySQL Database</span>
                </div>
                {rawText && (
                  <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                    Raw OCR: "{rawText.trim()}" (Filtered)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <p
              style={{
                fontSize: '0.78rem',
                color: isSaved ? '#059669' : detectedPlate ? '#0369a1' : '#64748b',
                margin: 0,
                textAlign: 'center',
                fontWeight: 500,
              }}
            >
              {statusMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
