import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Car,
  User,
  Phone,
  Clock,
  MapPin,
  RefreshCw,
  QrCode,
  LogIn,
  LogOut,
  FlipHorizontal,
  FileImage,
  ShieldCheck,
  Search,
} from 'lucide-react';
import jsQR from 'jsqr';
import { bookingApi } from '../../services/api/bookingApi';
import type { Booking } from '../../services/api/bookingApi';

export interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingUpdated?: (booking: Booking) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onBookingUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<{
    accessGranted: boolean;
    status: string;
    message: string;
    validUntil?: string;
    remainingTime?: string;
    booking: Booking | null;
  } | null>(null);

  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isScanningRef = useRef<boolean>(false);

  // Sound feedback on successful scan
  const playScanBeep = (success: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (success) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.18);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      }
    } catch {
      // AudioContext not allowed or not supported, ignore silently
    }
  };

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    isScanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Process raw text string from QR scan
  const processQrText = useCallback(
    async (rawText: string, action: 'VERIFY' | 'CHECK_IN' | 'CHECK_OUT' = 'VERIFY') => {
      if (!rawText.trim()) return;
      setIsProcessing(true);
      try {
        const res = await bookingApi.scanQr({ qrData: rawText, action });
        if (res.data) {
          setScanResult(res.data);
          playScanBeep(res.data.accessGranted);
          if (res.data.booking && onBookingUpdated) {
            onBookingUpdated(res.data.booking);
          }
        } else {
          setScanResult({
            accessGranted: false,
            status: 'NOT_FOUND',
            message: res.message || 'Booking record not found for this QR code.',
            booking: null,
          });
          playScanBeep(false);
        }
      } catch (err: any) {
        setScanResult({
          accessGranted: false,
          status: 'ERROR',
          message: err?.message || 'Failed to scan and verify QR code.',
          booking: null,
        });
        playScanBeep(false);
      } finally {
        setIsProcessing(false);
      }
    },
    [onBookingUpdated]
  );

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        isScanningRef.current = true;
        scanVideoFrame();
      }
    } catch (err: any) {
      console.warn('Camera access failed:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera permissions in your browser or switch to "Upload Image".'
          : 'Could not access camera. Please make sure no other app is using it.'
      );
      setIsCameraActive(false);
    }
  }, [cameraFacing, stopCamera]);

  // Real-time Video Frame Scanning Loop via jsQR
  const scanVideoFrame = () => {
    if (!isScanningRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          // Found QR Code!
          isScanningRef.current = false;
          stopCamera();
          processQrText(code.data, 'VERIFY');
          return;
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(scanVideoFrame);
  };

  // Flip Camera Front/Back
  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Process uploaded image file
  const handleImageUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedImagePreview(dataUrl);

      // 1. Try decoding with client-side jsQR
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            processQrText(code.data, 'VERIFY');
            return;
          }
        }

        // 2. Fallback to server-side scan if client couldn't decode
        const formData = new FormData();
        formData.append('image', file);
        setIsProcessing(true);
        bookingApi
          .scanQrImage(formData, 'VERIFY')
          .then((res) => {
            if (res.data) {
              setScanResult(res.data);
              playScanBeep(res.data.accessGranted);
              if (res.data.booking && onBookingUpdated) {
                onBookingUpdated(res.data.booking);
              }
            } else {
              setScanResult({
                accessGranted: false,
                status: 'NOT_FOUND',
                message: res.message || 'Could not find any readable QR code in this image.',
                booking: null,
              });
              playScanBeep(false);
            }
          })
          .catch((err) => {
            setScanResult({
              accessGranted: false,
              status: 'NOT_FOUND',
              message: err?.message || 'Could not decode QR code. Please provide a clear image.',
              booking: null,
            });
            playScanBeep(false);
          })
          .finally(() => setIsProcessing(false));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Perform Gate Actions (Check-In / Check-Out)
  const handleGateAction = async (action: 'CHECK_IN' | 'CHECK_OUT') => {
    if (!scanResult?.booking?.id) return;
    setActionLoading(true);
    try {
      const res = await bookingApi.scanQr({
        qrData: scanResult.booking.id,
        action,
      });
      if (res.data) {
        setScanResult(res.data);
        if (res.data.booking && onBookingUpdated) {
          onBookingUpdated(res.data.booking);
        }
      }
    } catch (err: any) {
      alert(`Action failed: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Reset to scan another pass
  const handleResetScan = () => {
    setScanResult(null);
    setUploadedImagePreview(null);
    setManualCode('');
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  // Start camera when modal opens on camera tab
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !scanResult) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, cameraFacing, scanResult, startCamera, stopCamera]);

  if (!isOpen) return null;

  // Format Helper
  const formatDateTime = (dateStr?: string | Date) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-color, #e2e8f0)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary, #f8fafc)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
              }}
            >
              <QrCode size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                QR Code Scanner & Pass Validator
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
                Instant vehicle verification & gate access
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
              color: 'var(--text-muted, #94a3b8)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Controls (Only shown when no result is active) */}
        {!scanResult && (
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              background: '#f1f5f9',
              padding: '4px 8px',
              gap: '6px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 12px',
                fontSize: '0.82rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'camera' ? '#ffffff' : 'transparent',
                color: activeTab === 'camera' ? '#2563eb' : '#64748b',
                boxShadow: activeTab === 'camera' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Camera size={15} />
              Live Camera Feed
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                stopCamera();
              }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 12px',
                fontSize: '0.82rem',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'upload' ? '#ffffff' : 'transparent',
                color: activeTab === 'upload' ? '#2563eb' : '#64748b',
                boxShadow: activeTab === 'upload' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Upload size={15} />
              Upload Image / File
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* RESULT VIEW: When QR is scanned and validated */}
          {scanResult ? (
            <div>
              {/* Access Banner */}
              <div
                style={{
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  background: scanResult.accessGranted
                    ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
                    : 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                  border: `1.5px solid ${scanResult.accessGranted ? '#10b981' : '#ef4444'}`,
                  boxShadow: `0 4px 12px ${scanResult.accessGranted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                }}
              >
                <div style={{ marginTop: '2px' }}>
                  {scanResult.accessGranted ? (
                    <CheckCircle2 size={32} color="#059669" />
                  ) : scanResult.status === 'EXPIRED' ? (
                    <Clock size={32} color="#dc2626" />
                  ) : (
                    <XCircle size={32} color="#dc2626" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: scanResult.accessGranted ? '#065f46' : '#991b1b',
                      }}
                    >
                      {scanResult.accessGranted ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                    </h3>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '20px',
                        background: scanResult.accessGranted ? '#10b981' : '#ef4444',
                        color: '#ffffff',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {scanResult.status}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '0.82rem',
                      color: scanResult.accessGranted ? '#047857' : '#b91c1c',
                      fontWeight: 500,
                    }}
                  >
                    {scanResult.message}
                  </p>
                  {scanResult.remainingTime && scanResult.accessGranted && (
                    <div style={{ marginTop: '6px', fontSize: '0.76rem', color: '#065f46', fontWeight: 600 }}>
                      ⏱️ Remaining Time: <strong>{scanResult.remainingTime}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Booking Details Card */}
              {scanResult.booking ? (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px',
                  }}
                >
                  {/* Top Bar: Vehicle Plate & Status */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #e2e8f0',
                      paddingBottom: '12px',
                      marginBottom: '12px',
                    }}
                  >
                    {/* Indian License Plate Badge */}
                    <div
                      style={{
                        background: '#ffffff',
                        border: '2px solid #0f172a',
                        borderRadius: '6px',
                        padding: '4px 12px',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '1.15rem',
                        letterSpacing: '1px',
                        color: '#0f172a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                      }}
                    >
                      <Car size={18} color="#2563eb" />
                      {scanResult.booking.vehicleNumber}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Total Paid/Amount</span>
                      <strong style={{ fontSize: '1.05rem', color: '#4f46e5', fontWeight: 800 }}>
                        ₹{Number(scanResult.booking.totalAmount || 0)}
                      </strong>
                    </div>
                  </div>

                  {/* Grid of Key Booking Details */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} /> Driver / Owner Name
                      </span>
                      <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>{scanResult.booking.userName}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} /> Phone Number
                      </span>
                      <strong style={{ color: '#0f172a', fontSize: '0.88rem' }}>{scanResult.booking.phoneNumber}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} color="#2563eb" /> Parking Area
                      </span>
                      <strong style={{ color: '#0f172a' }}>{scanResult.booking.parkingLotName || 'General Lot'}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Assigned Slot / Bay</span>
                      <strong style={{ color: '#2563eb', fontSize: '0.9rem' }}>
                        {scanResult.booking.slotNumber || 'Unassigned / Open'}
                      </strong>
                    </div>

                    {/* Start Date & End Date */}
                    <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} /> Start Time
                      </span>
                      <strong style={{ color: '#0f172a', fontSize: '0.78rem', display: 'block', marginTop: '2px' }}>
                        {formatDateTime(scanResult.booking.startDate)}
                      </strong>
                    </div>

                    <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} /> End Time (Expiry)
                      </span>
                      <strong style={{ color: '#0f172a', fontSize: '0.78rem', display: 'block', marginTop: '2px' }}>
                        {formatDateTime(scanResult.booking.endDate)}
                      </strong>
                    </div>

                    {/* Booked By */}
                    {scanResult.booking.bookedBy && (
                      <div style={{ gridColumn: 'span 2', background: '#f1f5f9', padding: '6px 10px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Booked By (Staff / Operator):</span>{' '}
                        <strong style={{ color: '#0f172a', fontSize: '0.78rem' }}>{scanResult.booking.bookedBy}</strong>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {scanResult.accessGranted && scanResult.booking?.status !== 'COMPLETED' && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleGateAction('CHECK_IN')}
                      style={{
                        flex: 1,
                        background: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                      }}
                    >
                      <LogIn size={16} />
                      {actionLoading ? 'Processing...' : 'Confirm Gate Check-In'}
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleGateAction('CHECK_OUT')}
                      style={{
                        flex: 1,
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                      }}
                    >
                      <LogOut size={16} />
                      {actionLoading ? 'Processing...' : 'Gate Check-Out (Complete)'}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleResetScan}
                  style={{
                    flex: scanResult.accessGranted ? 'none' : 1,
                    background: '#f1f5f9',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={15} />
                  Scan Another Pass
                </button>
              </div>
            </div>
          ) : (
            /* SCANNER VIEWS (Camera / Upload) */
            <div>
              {/* TAB 1: LIVE CAMERA SCANNER */}
              {activeTab === 'camera' && (
                <div>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '280px',
                      background: '#090d16',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)',
                    }}
                  >
                    <video
                      ref={videoRef}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />

                    {/* Laser Scanner Animation Overlay */}
                    {isCameraActive && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {/* Target Box with Corners */}
                        <div
                          style={{
                            width: '210px',
                            height: '210px',
                            border: '2px solid rgba(59, 130, 246, 0.8)',
                            borderRadius: '16px',
                            position: 'relative',
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                          }}
                        >
                          {/* Corner Markers */}
                          <div style={{ position: 'absolute', top: -3, left: -3, width: 22, height: 22, borderTop: '4px solid #38bdf8', borderLeft: '4px solid #38bdf8', borderTopLeftRadius: 10 }} />
                          <div style={{ position: 'absolute', top: -3, right: -3, width: 22, height: 22, borderTop: '4px solid #38bdf8', borderRight: '4px solid #38bdf8', borderTopRightRadius: 10 }} />
                          <div style={{ position: 'absolute', bottom: -3, left: -3, width: 22, height: 22, borderBottom: '4px solid #38bdf8', borderLeft: '4px solid #38bdf8', borderBottomLeftRadius: 10 }} />
                          <div style={{ position: 'absolute', bottom: -3, right: -3, width: 22, height: 22, borderBottom: '4px solid #38bdf8', borderRight: '4px solid #38bdf8', borderBottomRightRadius: 10 }} />

                          {/* Glowing Animated Red/Green Laser Line */}
                          <div
                            style={{
                              position: 'absolute',
                              left: '5%',
                              right: '5%',
                              height: '2px',
                              background: '#38bdf8',
                              boxShadow: '0 0 10px 2px #38bdf8',
                              animation: 'scanLaser 2s ease-in-out infinite alternate',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Camera Control Overlay (Flip button) */}
                    {isCameraActive && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          display: 'flex',
                          gap: '6px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={toggleCameraFacing}
                          title="Switch Front/Back Camera"
                          style={{
                            background: 'rgba(15, 23, 42, 0.75)',
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '0.74rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <FlipHorizontal size={14} />
                          Flip
                        </button>
                      </div>
                    )}

                    {/* Processing State */}
                    {isProcessing && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'rgba(15, 23, 42, 0.85)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          gap: '10px',
                        }}
                      >
                        <RefreshCw size={28} className="animate-spin" color="#38bdf8" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Decoding & Verifying QR Code...</span>
                      </div>
                    )}

                    {/* Error State */}
                    {cameraError && (
                      <div
                        style={{
                          padding: '20px',
                          textAlign: 'center',
                          color: '#f87171',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <AlertTriangle size={32} />
                        <span style={{ fontSize: '0.82rem' }}>{cameraError}</span>
                        <button
                          type="button"
                          onClick={startCamera}
                          style={{
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Retry Camera
                        </button>
                      </div>
                    )}
                  </div>

                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-muted, #64748b)',
                      textAlign: 'center',
                      marginTop: '10px',
                      marginBottom: '14px',
                    }}
                  >
                    Hold parking pass QR code steady in front of the camera to auto-scan
                  </p>
                </div>
              )}

              {/* TAB 2: UPLOAD IMAGE / DRAG & DROP */}
              {activeTab === 'upload' && (
                <div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleImageUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--border-color, #cbd5e1)',
                      borderRadius: '12px',
                      padding: '30px 20px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageUpload(e.target.files[0]);
                        }
                      }}
                    />

                    {uploadedImagePreview ? (
                      <div style={{ position: 'relative', maxWidth: '180px' }}>
                        <img
                          src={uploadedImagePreview}
                          alt="Uploaded QR"
                          style={{
                            width: '100%',
                            maxHeight: '160px',
                            objectFit: 'contain',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                          }}
                        />
                        <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'block', marginTop: '6px' }}>
                          Click to choose a different image
                        </span>
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FileImage size={24} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>
                            Click to upload or drag & drop QR pass image
                          </p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                            Supports PNG, JPG, JPEG, WEBP files
                          </p>
                        </div>
                      </>
                    )}

                    {isProcessing && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563eb', fontSize: '0.82rem', fontWeight: 600 }}>
                        <RefreshCw size={15} className="animate-spin" />
                        Decoding QR Pass...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MANUAL SEARCH / CODE INPUT (Universal Fallback) */}
              <div
                style={{
                  borderTop: '1px solid var(--border-color, #e2e8f0)',
                  paddingTop: '14px',
                  marginTop: '10px',
                }}
              >
                <label style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                  Or enter Gadi / Booking Number manually:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="e.g. DL 01 AB 1234 or Booking ID"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        processQrText(manualCode);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    disabled={isProcessing || !manualCode.trim()}
                    onClick={() => processQrText(manualCode)}
                    style={{
                      background: 'var(--accent-blue, #2563eb)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Search size={14} />
                    Verify
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--bg-secondary, #f8fafc)',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#64748b' }}>
            <ShieldCheck size={14} color="#059669" />
            <span>Real-time Secure Parking Gate Pass Verification</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Laser Scan Animation Keyframes */}
      <style>{`
        @keyframes scanLaser {
          0% { top: 6%; }
          100% { top: 92%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
