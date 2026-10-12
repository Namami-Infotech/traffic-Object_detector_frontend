import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Scan, ShieldCheck, Database, Camera, Check, Edit3, Image as ImageIcon, AlertCircle, RotateCcw } from 'lucide-react';
import { plateRecognitionService } from '../services/plateRecognitionService';
import { detectionService } from '../services/detectionService';
import { sanitizeAndValidatePlate } from '../../../utils/plateValidator';

export interface PlateScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlateSaved?: (plate: string, details?: { vehicleType: string; event: 'IN' | 'OUT' | 'DETECTION' }) => void;
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
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [detectedPlate, setDetectedPlate] = useState<string | null>(null);
  const [manualInputPlate, setManualInputPlate] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [rawText, setRawText] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<string>('CAR');
  const [scanDirection, setScanDirection] = useState<'IN' | 'OUT' | 'DETECTION'>('IN');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tapMarker, setTapMarker] = useState<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backCameraInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const resetState = () => {
    setImagePreview(null);
    setCropPreview(null);
    setIsScanning(false);
    setDetectedPlate(null);
    setManualInputPlate('');
    setConfidence(0);
    setRawText('');
    setStatusMessage('');
    setIsSaved(false);
    setIsEditing(false);
    setTapMarker(null);
    setScanDirection('IN');
    setVehicleType('CAR');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Reset all state when modal closes or opens fresh
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      setImagePreview(url);
      setCropPreview(null);
      setDetectedPlate(null);
      setManualInputPlate('');
      setRawText('');
      setStatusMessage('');
      setIsSaved(false);
      setIsEditing(false);
      setTapMarker(null);
      runScan(url);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
    setCropPreview(null);
    setDetectedPlate(null);
    setManualInputPlate('');
    setRawText('');
    setStatusMessage('');
    setIsSaved(false);
    setIsEditing(false);
    setTapMarker(null);
    runScan(dataUrl);
  };

  const runScan = async (imgSource: string) => {
    setIsScanning(true);
    setStatusMessage('Running YOLOv8 vehicle isolation & ANPR license plate recognition...');

    try {
      const res = await plateRecognitionService.recognizePlate(imgSource);
      setRawText(res.rawText);
      if (res.cropDataUrl) {
        setCropPreview(res.cropDataUrl);
      }

      // ONLY accept if validation confirms a genuine Indian license plate format!
      if (res.isValid && res.plateNumber) {
        const finalPlate = res.formattedPlate || res.plateNumber;
        setDetectedPlate(finalPlate);
        setManualInputPlate(finalPlate);
        setConfidence(res.confidence);
        setStatusMessage(`✅ Valid License Plate Recognized: ${finalPlate}`);

        // Automatically save genuine plate into MySQL database
        await saveToDatabase(finalPlate, res.confidence);
      } else {
        setDetectedPlate(null);
        setManualInputPlate('');
        setIsSaved(false);
        setStatusMessage(
          '⚠️ No clear license plate found automatically. You can tap on the plate in the photo or type the number below.'
        );
      }
    } catch (err: any) {
      setStatusMessage(`Scanning failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * Tap on image preview to scan that exact tapped region
   */
  const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current || !imagePreview || isScanning) return;

    const rect = imageRef.current.getBoundingClientRect();
    const elemW = rect.width;
    const elemH = rect.height;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    setTapMarker({ x: clickX, y: clickY });
    setIsScanning(true);
    setStatusMessage('Scanning tapped region for license plate...');

    try {
      const img = new Image();
      img.src = imagePreview;
      await new Promise((res) => { img.onload = res; });

      const nw = img.naturalWidth;
      const nh = img.naturalHeight;

      // Handle objectFit: 'contain' letterbox offsets
      const imgRatio = nw / nh;
      const elemRatio = elemW / elemH;
      let renderedW = elemW;
      let renderedH = elemH;
      let offsetX = 0;
      let offsetY = 0;

      if (elemRatio > imgRatio) {
        renderedW = elemH * imgRatio;
        offsetX = (elemW - renderedW) / 2;
      } else {
        renderedH = elemW / imgRatio;
        offsetY = (elemH - renderedH) / 2;
      }

      const clickInImgX = clickX - offsetX;
      const clickInImgY = clickY - offsetY;

      // Check if clicked inside actual image area
      if (clickInImgX < 0 || clickInImgX > renderedW || clickInImgY < 0 || clickInImgY > renderedH) {
        setIsScanning(false);
        return;
      }

      const naturalCenterX = (clickInImgX / renderedW) * nw;
      const naturalCenterY = (clickInImgY / renderedH) * nh;

      // Generous crop around tapped plate (50% width, 24% height of natural image)
      const cropW = Math.min(nw, Math.round(nw * 0.50));
      const cropH = Math.min(nh, Math.round(nh * 0.24));
      const cropX = Math.max(0, Math.min(Math.round(naturalCenterX - cropW / 2), nw - cropW));
      const cropY = Math.max(0, Math.min(Math.round(naturalCenterY - cropH / 2), nh - cropH));

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      }

      const tappedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCropPreview(tappedDataUrl);

      const res = await plateRecognitionService.recognizePlate(canvas, true);
      setRawText(res.rawText);

      if (res.isValid && res.plateNumber) {
        const finalPlate = res.formattedPlate || res.plateNumber;
        setDetectedPlate(finalPlate);
        setManualInputPlate(finalPlate);
        setConfidence(res.confidence);
        setStatusMessage(`✅ License Plate Recognized from Tapped Area: ${finalPlate}`);
        await saveToDatabase(finalPlate, res.confidence);
      } else {
        setStatusMessage('⚠️ Could not extract plate from tapped spot. You can type it directly below.');
      }
    } catch (tapErr) {
      console.warn('Tap scan error:', tapErr);
    } finally {
      setIsScanning(false);
    }
  };

  const saveToDatabase = async (
    plateToSave: string,
    confScore: number,
    customDirection?: 'IN' | 'OUT' | 'DETECTION',
    customVehicle?: string
  ) => {
    const clean = plateToSave.trim().toUpperCase();
    if (!clean) return;
    const evt = customDirection || scanDirection;
    const vType = (customVehicle || vehicleType).toUpperCase();
    const camId = activeCameraId || 'default-webcam';

    try {
      const res = await detectionService.logEvent({
        cameraId: camId,
        vehicleType: vType,
        plateNumber: clean,
        plateConfidence: confScore,
        confidence: confScore || 0.95,
        event: evt,
        inCount: evt === 'IN' ? 1 : 0,
        outCount: evt === 'OUT' ? 1 : 0,
        count: 1,
      });

      if (res && (res as any).success === false) {
        throw new Error((res as any).message || 'Server rejected detection log');
      }

      const savedData = res?.data || (res as any);
      const dbId = savedData?.id;

      setIsSaved(true);
      onPlateSaved?.(clean, {
        vehicleType: vType,
        event: evt,
        dbId,
        confidence: confScore,
      } as any);
      const dirText = evt === 'IN' ? 'Entry (IN ↗)' : evt === 'OUT' ? 'Exit (OUT ↘)' : 'Detection';
      setStatusMessage(`✅ Saved plate "${clean}" (${dirText} - ${vType}) to MySQL database successfully!`);
    } catch (saveErr: any) {
      console.error('Save to database error:', saveErr);
      setStatusMessage(`❌ Database Save Failed: ${saveErr.message || 'Error communicating with server'}`);
    }
  };

  const handleManualSave = async () => {
    const val = manualInputPlate.trim().toUpperCase();
    if (!val) return;

    // Validate plate format before saving
    const validation = sanitizeAndValidatePlate(val);
    const plateToSave = validation.isValid ? validation.formattedPlate : val;

    await saveToDatabase(plateToSave, 0.95);
    setDetectedPlate(plateToSave);
    setIsEditing(false);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
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
          maxHeight: '92vh',
          overflowY: 'auto',
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
            onClick={handleClose}
            title="Close & Reset Scanner"
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
          {/* Action buttons (Dedicated Mobile Back Camera + Gallery Upload) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.2rem' }}>
            {/* Hidden Input for Direct Mobile Back Camera Capture */}
            <input
              type="file"
              ref={backCameraInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
            />
            {/* Hidden Input for Standard Photo Gallery Upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => backCameraInputRef.current?.click()}
                style={{
                  flex: '1 1 180px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '11px 14px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9px',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
                }}
              >
                <Camera size={18} />
                <span>Open Back Camera 📷 (फोन का कैमरा)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: '1 1 150px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '11px 14px',
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '9px',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                <Upload size={16} />
                <span>Gallery / File</span>
              </button>

              {videoRef && (
                <button
                  type="button"
                  onClick={handleCaptureFromCamera}
                  style={{
                    flex: '1 1 100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: '#334155',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  <Camera size={14} />
                  <span>Snapshot Live Stream</span>
                </button>
              )}
            </div>
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
              marginBottom: '1rem',
            }}
          >
            {imagePreview ? (
              <div style={{ position: 'relative', width: '100%', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={resetState}
                  title="Remove image / Reset (फोटो हटाएं)"
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(15, 23, 42, 0.78)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '6px',
                    padding: '4px 9px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    backdropFilter: 'blur(4px)',
                    zIndex: 10,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                  }}
                >
                  <RotateCcw size={12} /> Reset Image
                </button>
                <img
                  ref={imageRef}
                  src={imagePreview}
                  alt="Vehicle Preview"
                  onClick={handleImageClick}
                  title="Click directly on the license plate if auto-detection misses it"
                  style={{
                    width: '100%',
                    maxHeight: '380px',
                    objectFit: 'contain',
                    cursor: 'crosshair',
                  }}
                />
                {tapMarker && (
                  <div
                    style={{
                      position: 'absolute',
                      left: tapMarker.x,
                      top: tapMarker.y,
                      transform: 'translate(-50%, -50%)',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: '2px solid #38bdf8',
                      boxShadow: '0 0 10px #38bdf8, inset 0 0 6px #0284c7',
                      pointerEvents: 'none',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15, 23, 42, 0.75)',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    pointerEvents: 'none',
                  }}
                >
                  💡 Tip: Click/tap directly on the plate to focus scan
                </div>
              </div>
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
                  background: 'rgba(15, 23, 42, 0.7)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <Scan size={32} className="spin-animation" color="#38bdf8" />
                <span style={{ marginTop: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Scanning bumper ROI & recognizing plate...
                </span>
              </div>
            )}
          </div>

          {/* Scanned Plate Crop Preview if available */}
          {cropPreview && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                background: '#f1f5f9',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#64748b', fontWeight: 600, minWidth: '85px' }}>
                <ImageIcon size={14} color="#0284c7" />
                <span>Plate Crop:</span>
              </div>
              <img
                src={cropPreview}
                alt="Cropped Plate ROI"
                style={{
                  height: '42px',
                  maxWidth: '220px',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  background: '#000000',
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Bumper scan region
              </span>
            </div>
          )}

          {/* Detected Plate Result Card (ONLY shown when a genuine plate is detected) */}
          {detectedPlate ? (
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
                  <ShieldCheck size={14} /> {confidence ? `${Math.round(confidence * 100)}% Confidence` : 'Verified'}
                </span>
              </div>

              {/* Indian License Plate Badge */}
              <div style={{ margin: '10px 0', textAlign: 'center' }}>
                {!isEditing ? (
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
                ) : (
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={manualInputPlate}
                      onChange={(e) => setManualInputPlate(e.target.value.toUpperCase())}
                      placeholder="e.g. DL 3C DE 0953"
                      style={{
                        padding: '8px 12px',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        borderRadius: '6px',
                        border: '2px solid #0284c7',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        width: '220px',
                      }}
                    />
                    <button
                      onClick={handleManualSave}
                      style={{
                        padding: '8px 14px',
                        background: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Check size={16} /> Save
                    </button>
                  </div>
                )}
              </div>

              {/* Action buttons under plate */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '6px' }}>
                {!isEditing && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setManualInputPlate(detectedPlate);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Edit3 size={13} /> Edit / Correct Number
                  </button>
                )}
              </div>

              {/* Movement Direction & Vehicle Type Selection Controls */}
              <div style={{ marginTop: '10px', padding: '10px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginBottom: '5px' }}>
                    Movement Direction (प्रवेश / निकास):
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setScanDirection('IN');
                        if (detectedPlate) saveToDatabase(detectedPlate, confidence || 0.95, 'IN', vehicleType);
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: scanDirection === 'IN' ? '1.5px solid #059669' : '1px solid #cbd5e1',
                        background: scanDirection === 'IN' ? '#ecfdf5' : '#ffffff',
                        color: scanDirection === 'IN' ? '#047857' : '#475569',
                        fontSize: '0.75rem',
                        fontWeight: scanDirection === 'IN' ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      ↗ Entry (IN)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScanDirection('OUT');
                        if (detectedPlate) saveToDatabase(detectedPlate, confidence || 0.95, 'OUT', vehicleType);
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: scanDirection === 'OUT' ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                        background: scanDirection === 'OUT' ? '#fffbeb' : '#ffffff',
                        color: scanDirection === 'OUT' ? '#b45309' : '#475569',
                        fontSize: '0.75rem',
                        fontWeight: scanDirection === 'OUT' ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      ↘ Exit (OUT)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScanDirection('DETECTION');
                        if (detectedPlate) saveToDatabase(detectedPlate, confidence || 0.95, 'DETECTION', vehicleType);
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: scanDirection === 'DETECTION' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                        background: scanDirection === 'DETECTION' ? '#f0f9ff' : '#ffffff',
                        color: scanDirection === 'DETECTION' ? '#0369a1' : '#475569',
                        fontSize: '0.75rem',
                        fontWeight: scanDirection === 'DETECTION' ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      🔍 Detection
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, marginBottom: '5px' }}>
                    Vehicle Type (वाहन प्रकार):
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setVehicleType(v);
                          if (detectedPlate) saveToDatabase(detectedPlate, confidence || 0.95, scanDirection, v);
                        }}
                        style={{
                          flex: 1,
                          padding: '5px 6px',
                          borderRadius: '6px',
                          border: vehicleType === v ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                          background: vehicleType === v ? '#eff6ff' : '#ffffff',
                          color: vehicleType === v ? '#1d4ed8' : '#475569',
                          fontSize: '0.74rem',
                          fontWeight: vehicleType === v ? 700 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        {v === 'CAR' ? '🚗 Car' : v === 'TRUCK' ? '🚚 Truck' : v === 'BUS' ? '🚌 Bus' : '🏍️ Bike'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status info */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.75rem', marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isSaved ? '#059669' : '#64748b', fontWeight: 600 }}>
                  <Database size={14} />
                  <span>{isSaved ? 'Saved into MySQL Database' : 'Ready to save'}</span>
                </div>
                {rawText && (
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                    Raw OCR: "{rawText.trim()}"
                  </span>
                )}
              </div>
            </div>
          ) : imagePreview ? (
            /* Manual Plate Entry fallback card if auto-detection misses */
            <div
              style={{
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.78rem', fontWeight: 600, marginBottom: '8px' }}>
                <AlertCircle size={15} color="#0284c7" />
                <span>Enter or Correct Number Plate Manually:</span>
              </div>

              {/* Movement Direction & Vehicle Type for Manual Input */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setScanDirection('IN')}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      borderRadius: '6px',
                      border: scanDirection === 'IN' ? '1.5px solid #059669' : '1px solid #cbd5e1',
                      background: scanDirection === 'IN' ? '#ecfdf5' : '#ffffff',
                      color: scanDirection === 'IN' ? '#047857' : '#475569',
                      fontSize: '0.75rem',
                      fontWeight: scanDirection === 'IN' ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    ↗ Entry (IN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanDirection('OUT')}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      borderRadius: '6px',
                      border: scanDirection === 'OUT' ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                      background: scanDirection === 'OUT' ? '#fffbeb' : '#ffffff',
                      color: scanDirection === 'OUT' ? '#b45309' : '#475569',
                      fontSize: '0.75rem',
                      fontWeight: scanDirection === 'OUT' ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    ↘ Exit (OUT)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanDirection('DETECTION')}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      borderRadius: '6px',
                      border: scanDirection === 'DETECTION' ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                      background: scanDirection === 'DETECTION' ? '#f0f9ff' : '#ffffff',
                      color: scanDirection === 'DETECTION' ? '#0369a1' : '#475569',
                      fontSize: '0.75rem',
                      fontWeight: scanDirection === 'DETECTION' ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    🔍 Detection
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVehicleType(v)}
                      style={{
                        flex: 1,
                        padding: '4px 6px',
                        borderRadius: '6px',
                        border: vehicleType === v ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        background: vehicleType === v ? '#eff6ff' : '#ffffff',
                        color: vehicleType === v ? '#1d4ed8' : '#475569',
                        fontSize: '0.72rem',
                        fontWeight: vehicleType === v ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {v === 'CAR' ? '🚗 Car' : v === 'TRUCK' ? '🚚 Truck' : v === 'BUS' ? '🚌 Bus' : '🏍️ Bike'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={manualInputPlate}
                  onChange={(e) => setManualInputPlate(e.target.value.toUpperCase())}
                  placeholder="e.g. DL 3C DE 0953"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                />
                <button
                  onClick={handleManualSave}
                  disabled={!manualInputPlate.trim()}
                  style={{
                    padding: '8px 16px',
                    background: manualInputPlate.trim() ? '#0284c7' : '#94a3b8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: manualInputPlate.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Database size={14} /> Save Plate
                </button>
              </div>
            </div>
          ) : null}

          {/* Status Message */}
          {statusMessage && (
            <p
              style={{
                fontSize: '0.78rem',
                color: isSaved ? '#059669' : detectedPlate ? '#0369a1' : '#e11d48',
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
