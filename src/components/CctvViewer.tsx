import React, { useRef, useEffect, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { AlertCircle, Radio, Sliders, RotateCcw, Eye, ArrowLeftRight, ArrowUpDown } from 'lucide-react';
import { CentroidTracker } from '../utils/centroidTracker';
import type { LineConfig, TrackedObject } from '../utils/centroidTracker';
import { createDetectionLog, getAnalytics } from '../routes';
import { API_BASE_URL } from '../routes/config';
import { aiModelService } from '../services/aiModelService';
import { socketService } from '../services/socketService';
import { TRAFFIC_CONFIG, calculateTrafficDensity } from '../config/traffic.config';

export interface DetectionUpdateData {
  counts: Record<string, number>;
  inCount: number;
  outCount: number;
  activeCount: number;
  inEvents?: Array<{ id: number; label: string; score?: number; timestamp: number }>;
  outEvents?: Array<{ id: number; label: string; score?: number; timestamp: number }>;
  detectionEvents?: Array<{ id: number; label: string; score?: number; timestamp: number }>;
  log: any[];
}

interface CctvViewerProps {
  selectedCameraUrl: string;
  cameraType: 'WEBCAM' | 'USB_PHONE' | 'IP_RTSP' | 'DROIDCAM' | 'FILE';
  cameraId?: string;
  deviceId?: string;
  onDetectionUpdate: (data: DetectionUpdateData) => void;
  onModelLoaded: (loaded: boolean) => void;
}

export const CctvViewer: React.FC<CctvViewerProps> = ({
  selectedCameraUrl,
  cameraType,
  cameraId,
  deviceId,
  onDetectionUpdate,
  onModelLoaded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackerRef = useRef<CentroidTracker>(new CentroidTracker());

  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isDetecting] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Virtual Line & Tracking Settings State (Default VERTICAL - Khadi Line)
  const isRtspStream = Boolean(
    selectedCameraUrl &&
    (selectedCameraUrl.startsWith('rtsp://') || selectedCameraUrl.startsWith('rtsps://') || cameraType === 'IP_RTSP')
  );
  const mjpegStreamUrl = isRtspStream && cameraId ? `${API_BASE_URL || ''}/api/v1/cctv/cameras/${cameraId}/stream` : '';

  const [lineOrientation, setLineOrientation] = useState<'VERTICAL' | 'HORIZONTAL'>('HORIZONTAL');
  const [linePositionPercent, setLinePositionPercent] = useState<number>(50); // 50% screen position
  const [showTrajectories, setShowTrajectories] = useState<boolean>(true);

  // Live Line Crossing Counters State & Persistent Refs
  const [_inCount, setInCount] = useState<number>(0);
  const [_outCount, setOutCount] = useState<number>(0);
  const inCountRef = useRef<number>(0);
  const outCountRef = useRef<number>(0);
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const [activeVehicleCount, setActiveVehicleCount] = useState<number>(0);

  // Per-camera IN / OUT breakdown for each vehicle (e.g. CAR: { in: 1, out: 1 })
  const [cameraVehicleInOut, setCameraVehicleInOut] = useState<
    Record<string, { in: number; out: number }>
  >({
    CAR: { in: 0, out: 0 },
    TRUCK: { in: 0, out: 0 },
    BUS: { in: 0, out: 0 },
    MOTORCYCLE: { in: 0, out: 0 },
    PERSON: { in: 0, out: 0 },
  });

  const lastTimeRef = useRef<number>(performance.now());
  const lastDetectTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const reqAnimRef = useRef<number | null>(null);

  // Fetch initial total IN/OUT counts & vehicle breakdown from MySQL DB for THIS camera
  useEffect(() => {
    let isMounted = true;
    async function fetchDbCounts() {
      try {
        const json = await getAnalytics(cameraId);
        if (isMounted && json.success && json.data) {
          const initialIn = json.data.totalIn || 0;
          const initialOut = json.data.totalOut || 0;
          inCountRef.current = initialIn;
          outCountRef.current = initialOut;
          setInCount(initialIn);
          setOutCount(initialOut);

          if (json.data.vehicleInOut) {
            setCameraVehicleInOut({
              CAR: json.data.vehicleInOut.CAR || { in: 0, out: 0 },
              TRUCK: json.data.vehicleInOut.TRUCK || { in: 0, out: 0 },
              BUS: json.data.vehicleInOut.BUS || { in: 0, out: 0 },
              MOTORCYCLE: json.data.vehicleInOut.MOTORCYCLE || { in: 0, out: 0 },
            });
          }
        }
      } catch (err) {
        console.error('Failed to load initial camera counts from DB:', err);
      }
    }
    fetchDbCounts();
    return () => {
      isMounted = false;
    };
  }, [cameraId]);

  const updateCameraVehicleTally = (label: string, direction?: 'IN' | 'OUT') => {
    const upper = label.toUpperCase();
    if (['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE', 'PERSON'].includes(upper)) {
      if (direction) {
        setCameraVehicleInOut((prev) => {
          const current = prev[upper] || { in: 0, out: 0 };
          return {
            ...prev,
            [upper]: {
              ...current,
              [direction === 'IN' ? 'in' : 'out']: (current[direction === 'IN' ? 'in' : 'out'] || 0) + 1,
            },
          };
        });
      }
    }
  };

  // 1. Load Shared TensorFlow.js Model via Singleton Service
  useEffect(() => {
    let isMounted = true;
    async function loadModel() {
      try {
        onModelLoaded(false);
        const loadedModel = await aiModelService.getModel();
        if (isMounted) {
          setModel(loadedModel);
          onModelLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load TensorFlow model', err);
        setCameraError('AI Model loading failed.');
      }
    }
    loadModel();
    return () => {
      isMounted = false;
    };
  }, []);

  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  const [isBroadcastingLocal, setIsBroadcastingLocal] = useState<boolean>(false);
  const broadcastIntervalRef = useRef<any>(null);
  const [hasRemoteFeed, setHasRemoteFeed] = useState<boolean>(false);
  const [remoteImageSrc, setRemoteImageSrc] = useState<string>('');
  const remoteImgRef = useRef<HTMLImageElement | null>(null);
  const remoteDisplayImgRef = useRef<HTMLImageElement | null>(null);
  const lastRemoteFrameTimeRef = useRef<number>(0);
  const lastRestartRequestTimeRef = useRef<number>(0);
  const localCameraActiveRef = useRef<boolean>(false);

  // Listen for incoming remote camera frames over Socket.IO (from phones / other devices)
  useEffect(() => {
    const targetCamId = cameraId || 'default-webcam';

    // Create offscreen image element for remote decoding
    if (!remoteImgRef.current) {
      const img = new Image();
      remoteImgRef.current = img;
    }

    const handleRemoteFrame = (data: { cameraId: string; image: string; timestamp: number }) => {
      // IMPORTANT: If this tile already has a local webcam running, IGNORE remote frames
      // This prevents phone video from overriding the laptop's own webcam tile
      if (localCameraActiveRef.current) return;

      if (data.cameraId === targetCamId && data.image) {
        lastRemoteFrameTimeRef.current = Date.now();
        setHasRemoteFeed(true);
        setRemoteImageSrc(data.image);
        setCameraError(null);
        if (remoteImgRef.current) {
          remoteImgRef.current.src = data.image;
        }
      }
    };

    // STRICTLY listen only to this specific camera ID stream to prevent feed crosstalk
    socketService.on(`camera_frame_${targetCamId}`, handleRemoteFrame);

    // Heartbeat check for remote feed timeout
    const timeoutCheck = setInterval(() => {
      const elapsed = Date.now() - lastRemoteFrameTimeRef.current;
      if (lastRemoteFrameTimeRef.current > 0 && elapsed > 8000) {
        if (isRtspStream && Date.now() - lastRestartRequestTimeRef.current > 12000) {
          lastRestartRequestTimeRef.current = Date.now();
          // Request backend to refresh/restart the stream worker if stalled
          socketService.emit('request_camera_restart', { cameraId: targetCamId });
        }
        // Only completely clear the image if feed is dead for > 15 seconds
        if (elapsed > 15000) {
          setHasRemoteFeed(false);
          setRemoteImageSrc('');
        }
      }
    }, 3000);

    return () => {
      socketService.off(`camera_frame_${targetCamId}`, handleRemoteFrame);
      clearInterval(timeoutCheck);
    };
  }, [cameraId, isRtspStream]);

  // Handle local camera broadcast loop
  useEffect(() => {
    if (!isBroadcastingLocal) {
      if (broadcastIntervalRef.current) {
        clearInterval(broadcastIntervalRef.current);
        broadcastIntervalRef.current = null;
      }
      return;
    }

    const targetCamId = cameraId || 'default-webcam';
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 480;
    offscreenCanvas.height = 360;
    const offCtx = offscreenCanvas.getContext('2d');

    broadcastIntervalRef.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState < 2 || !offCtx) return;
      offCtx.drawImage(videoRef.current, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
      const frameData = offscreenCanvas.toDataURL('image/jpeg', 0.5);

      socketService.emit('camera_frame_broadcast', {
        cameraId: targetCamId,
        image: frameData,
        timestamp: Date.now(),
      });
    }, 100); // 10 FPS broadcast

    return () => {
      if (broadcastIntervalRef.current) {
        clearInterval(broadcastIntervalRef.current);
        broadcastIntervalRef.current = null;
      }
    };
  }, [isBroadcastingLocal, cameraId]);

  // 2. Setup Camera Stream
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function initCamera() {
      setCameraError(null);
      if (!videoRef.current) return;

      // ===== REMOTE/PHONE CAMERA: Don't open any local stream, just wait for Socket frames =====
      const isRemoteOnly =
        cameraType === 'USB_PHONE' ||
        selectedCameraUrl === 'remote-stream' ||
        (cameraId && cameraId !== 'default-webcam' && (!selectedCameraUrl || selectedCameraUrl === 'webcam' || selectedCameraUrl === ''));

      if (isRemoteOnly) {
        // This tile is reserved for a remote device (phone/other system).
        // Don't try to open webcam or play a URL. Socket listener will handle the feed.
        return;
      }

      // Determine stream source type:
      // Check stream type
      const isRtspStream = Boolean(
        selectedCameraUrl &&
        (selectedCameraUrl.startsWith('rtsp://') || selectedCameraUrl.startsWith('rtsps://') || cameraType === 'IP_RTSP')
      );

      // ONLY the default-webcam or a specific secondary hardware device can open the system webcam
      const isDefaultWebcam = (cameraId === 'default-webcam' || !cameraId) && (!selectedCameraUrl || selectedCameraUrl === 'webcam' || selectedCameraUrl === '');
      const isSpecificSecondaryHardware = Boolean(deviceId && deviceId !== 'webcam' && deviceId.trim().length > 0);
      const isDirectMediaFile = Boolean(
        selectedCameraUrl &&
        !isRtspStream &&
        selectedCameraUrl !== 'webcam' &&
        selectedCameraUrl !== 'remote-stream' &&
        (selectedCameraUrl.startsWith('http://') ||
          selectedCameraUrl.startsWith('https://') ||
          selectedCameraUrl.startsWith('blob:') ||
          selectedCameraUrl.endsWith('.mp4') ||
          selectedCameraUrl.endsWith('.webm'))
      );

      // Clean up previous video source & tracks
      if (videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        if (oldStream.getTracks) {
          oldStream.getTracks().forEach((track) => track.stop());
        }
        videoRef.current.srcObject = null;
      }
      videoRef.current.removeAttribute('src');

      if (isRtspStream) {
        // RTSP streams are transcoded by backend FFmpeg and broadcast via Socket.IO frames
        setCameraError(null);
      } else if (isDefaultWebcam || isSpecificSecondaryHardware) {
        // Grab local hardware webcam ONLY for the primary webcam tile
        const targetDeviceId = deviceId || (selectedCameraUrl !== 'webcam' && selectedCameraUrl !== '' ? selectedCameraUrl : undefined);

        const constraintsToTry: any[] = [];
        if (targetDeviceId && targetDeviceId.trim().length > 0) {
          constraintsToTry.push({ video: { deviceId: { exact: targetDeviceId } } });
          constraintsToTry.push({ video: { deviceId: { ideal: targetDeviceId } } });
        }
        constraintsToTry.push({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } });
        constraintsToTry.push({ video: true });

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (!hasRemoteFeed) {
            setCameraError('Camera blocked: Open via https://192.168.1.13:5173 and allow permissions.');
          }
          return;
        }

        let acquired = false;
        for (const constraints of constraintsToTry) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              await videoRef.current.play();
              currentStream = stream;
              acquired = true;
              localCameraActiveRef.current = true; // Mark this tile as having a live local webcam
              setIsBroadcastingLocal(true); // Automatically broadcast local webcam to all other devices on the network!
              setCameraError(null);
              break;
            }
          } catch (err) {
            console.warn('getUserMedia constraint fallback failed:', constraints, err);
          }
        }

        if (!acquired && !hasRemoteFeed) {
          setCameraError('Camera is busy or permission not granted. Click "Start Local Webcam" below.');
        }
      } else if (isDirectMediaFile) {
        videoRef.current.src = selectedCameraUrl;
        videoRef.current.play().catch(() => {
          if (!hasRemoteFeed) {
            setCameraError('Unable to play stream URL.');
          }
        });
      } else {
        // Remote stream or Phone Camera: do not hijack the laptop webcam, wait for socket frames
      }
    }

    initCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        if (oldStream.getTracks) {
          oldStream.getTracks().forEach((track) => track.stop());
        }
        videoRef.current.srcObject = null;
      }
    };
  }, [selectedCameraUrl, cameraType, deviceId, retryTrigger, cameraId]);

  // Reset Counters
  const handleResetCounters = () => {
    inCountRef.current = 0;
    outCountRef.current = 0;
    setInCount(0);
    setOutCount(0);
    setCameraVehicleInOut({
      CAR: { in: 0, out: 0 },
      TRUCK: { in: 0, out: 0 },
      BUS: { in: 0, out: 0 },
      MOTORCYCLE: { in: 0, out: 0 },
    });
    trackerRef.current.reset();
    onDetectionUpdate({
      counts: { car: 0, bus: 0, truck: 0, motorcycle: 0, person: 0, bicycle: 0 },
      inCount: 0,
      outCount: 0,
      activeCount: 0,
      inEvents: [],
      outEvents: [],
      log: [],
    });
  };

  // 3. Main Real-time Object Detection & Centroid Line Tracking Loop
  useEffect(() => {
    if (!model || !isDetecting) return;

    let isSubscribed = true;

    async function detectFrame() {
      const activeImg = remoteDisplayImgRef.current || remoteImgRef.current;
      const isRemoteActive = (hasRemoteFeed || isRtspStream) && activeImg && activeImg.naturalWidth > 0;
      const isLocalActive = videoRef.current && videoRef.current.readyState >= 2;

      if (!isRemoteActive && !isLocalActive) {
        if (isSubscribed) {
          reqAnimRef.current = requestAnimationFrame(detectFrame);
        }
        return;
      }

      const now = performance.now();
      // FRAME SAMPLING / THROTTLING: Target 5 FPS per camera (~200ms interval) to save CPU/GPU
      if (now - lastDetectTimeRef.current < TRAFFIC_CONFIG.AI.DETECTION_INTERVAL_MS) {
        if (isSubscribed) {
          reqAnimRef.current = requestAnimationFrame(detectFrame);
        }
        return;
      }
      lastDetectTimeRef.current = now;

      const canvas = canvasRef.current;
      if (!canvas || !model) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let rawPredictions: any[] = [];

      if (isRemoteActive && activeImg) {
        canvas.width = activeImg.naturalWidth || 640;
        canvas.height = activeImg.naturalHeight || 480;
        rawPredictions = await model.detect(activeImg, 30, TRAFFIC_CONFIG.AI.CONFIDENCE_THRESHOLD);
      } else if (isLocalActive && videoRef.current) {
        const video = videoRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        rawPredictions = await model.detect(video, 30, TRAFFIC_CONFIG.AI.CONFIDENCE_THRESHOLD);
      }

      // Filter predictions for valid classes (vehicles & pedestrians)
      const allowedClasses = TRAFFIC_CONFIG.AI.ALLOWED_CLASSES;
      const predictions = rawPredictions.filter((p) => allowedClasses.includes(p.class.toLowerCase()));

      // Update Centroid Tracker with Virtual Line Config
      const lineConfig: LineConfig = {
        orientation: lineOrientation,
        positionPercent: linePositionPercent,
      };

      const { objects, inEvents, outEvents, detectionEvents } = trackerRef.current.update(
        predictions,
        lineConfig,
        canvas.width,
        canvas.height
      );

      // Automatically record newly confirmed vehicles to DB as 'DETECTION' event
      if (detectionEvents.length > 0) {
        detectionEvents.forEach((evt) => {
          updateCameraVehicleTally(evt.label);
          createDetectionLog({
            cameraId: cameraId || 'default-webcam',
            vehicleType: (evt.label || 'car').toUpperCase(),
            trackId: evt.id,
            event: 'DETECTION',
            confidence: evt.score || 0.95,
            count: 1,
            inCount: inCountRef.current,
            outCount: outCountRef.current,
          }).catch(() => { });
        });
      }

      // Update IN / OUT counts from new line crossing events & Sync with MySQL DB
      if (inEvents.length > 0) {
        inCountRef.current += inEvents.length;
        const currentIn = inCountRef.current;
        setInCount(currentIn);
        inEvents.forEach((evt) => {
          updateCameraVehicleTally(evt.label, 'IN');
          createDetectionLog({
            cameraId: cameraId || 'default-webcam',
            vehicleType: (evt.label || 'car').toUpperCase(),
            trackId: evt.id,
            event: 'IN',
            confidence: (evt as any).score || 0.95,
            count: 1,
            inCount: currentIn,
            outCount: outCountRef.current,
          }).catch(() => { });
        });
      }

      if (outEvents.length > 0) {
        outCountRef.current += outEvents.length;
        const currentOut = outCountRef.current;
        setOutCount(currentOut);
        outEvents.forEach((evt) => {
          updateCameraVehicleTally(evt.label, 'OUT');
          createDetectionLog({
            cameraId: cameraId || 'default-webcam',
            vehicleType: (evt.label || 'car').toUpperCase(),
            trackId: evt.id,
            event: 'OUT',
            confidence: (evt as any).score || 0.95,
            count: 1,
            inCount: inCountRef.current,
            outCount: currentOut,
          }).catch(() => { });
        });
      }

      // Clear Canvas Overlay
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // --- DRAW VIRTUAL LINE ---
      const lineCoord =
        lineOrientation === 'HORIZONTAL'
          ? (canvas.height * linePositionPercent) / 100
          : (canvas.width * linePositionPercent) / 100;

      ctx.save();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#f59e0b'; // Amber yellow glowing line
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      if (lineOrientation === 'HORIZONTAL') {
        ctx.moveTo(0, lineCoord);
        ctx.lineTo(canvas.width, lineCoord);
      } else {
        ctx.moveTo(lineCoord, 0);
        ctx.lineTo(lineCoord, canvas.height);
      }
      ctx.stroke();
      ctx.restore();

      // Draw Virtual Line Labels & Direction Arrows
      ctx.font = 'bold 13px Outfit, sans-serif';
      if (lineOrientation === 'HORIZONTAL') {
        // Line Title Badge
        ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
        ctx.fillRect(15, lineCoord - 26, 175, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`VIRTUAL LINE (${linePositionPercent}%)`, 22, lineCoord - 10);

        // Direction Badges (IN / OUT)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.85)'; // Green IN
        ctx.fillRect(canvas.width - 110, lineCoord + 6, 95, 22);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('▼ IN (Enter)', canvas.width - 102, lineCoord + 21);

        ctx.fillStyle = 'rgba(239, 68, 68, 0.85)'; // Red OUT
        ctx.fillRect(canvas.width - 110, lineCoord - 28, 95, 22);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('▲ OUT (Exit)', canvas.width - 102, lineCoord - 13);
      } else {
        // Vertical Line
        ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
        ctx.fillRect(lineCoord - 85, 15, 170, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`VIRTUAL LINE (${linePositionPercent}%)`, lineCoord - 78, 31);

        // IN / OUT Badges
        ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
        ctx.fillRect(lineCoord + 6, 50, 85, 22);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('IN ►', lineCoord + 28, 65);

        ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.fillRect(lineCoord - 91, 50, 85, 22);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('◄ OUT', lineCoord - 68, 65);
      }

      // --- DRAW TRACKED OBJECTS & TRAJECTORIES ---
      const currentCounts: Record<string, number> = {
        car: 0,
        bus: 0,
        truck: 0,
        motorcycle: 0,
        person: 0,
        bicycle: 0,
      };

      const detectedLogs: any[] = [];

      objects.forEach((obj: TrackedObject) => {
        if (obj.disappeared > 0) return; // skip momentarily disappeared objects

        const [x, y, width, height] = obj.bbox;
        const [cx, cy] = obj.centroid;
        const label = obj.label.toLowerCase();

        if (currentCounts.hasOwnProperty(label)) {
          currentCounts[label] += 1;
        }

        // Color coding by vehicle class
        let baseColor = '#3b82f6'; // default blue
        if (label === 'car') baseColor = '#10b981'; // green
        if (label === 'bus') baseColor = '#f59e0b'; // amber
        if (label === 'truck') baseColor = '#ef4444'; // red
        if (label === 'motorcycle') baseColor = '#8b5cf6'; // purple
        if (label === 'person') baseColor = '#06b6d4'; // cyan

        // 1. Draw Trajectory Motion Trail
        if (showTrajectories && obj.trajectory.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = baseColor;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]); // dashed trail
          ctx.moveTo(obj.trajectory[0][0], obj.trajectory[0][1]);
          for (let i = 1; i < obj.trajectory.length; i++) {
            ctx.lineTo(obj.trajectory[i][0], obj.trajectory[i][1]);
          }
          ctx.stroke();
          ctx.setLineDash([]); // reset dash

          // Draw trail dots
          obj.trajectory.forEach(([tx, ty]) => {
            ctx.beginPath();
            ctx.arc(tx, ty, 3, 0, 2 * Math.PI);
            ctx.fillStyle = baseColor;
            ctx.fill();
          });
        }

        // 2. Draw Bounding Box
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = obj.isStationary ? 2 : 3;
        ctx.strokeRect(x, y, width, height);

        // 3. Draw Centroid Dot
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = baseColor;
        ctx.stroke();

        // 4. Draw Header Badge (CLASS + UNIQUE TRACK ID + STABLE INDICATOR)
        let statusBadge = '';
        if (obj.isStationary) {
          statusBadge = ' [STABLE]';
        } else if (obj.crossedIn) {
          statusBadge = ' [IN]';
        } else if (obj.crossedOut) {
          statusBadge = ' [OUT]';
        }

        const badgeText = `${obj.label.toUpperCase()} #${obj.id} ${Math.round(obj.score * 100)}%${statusBadge}`;
        ctx.font = 'bold 13px Outfit, sans-serif';
        const textWidth = ctx.measureText(badgeText).width;

        // Background box for label badge
        ctx.fillStyle = obj.isStationary ? '#475569' : baseColor;
        ctx.fillRect(x, y > 24 ? y - 24 : y, textWidth + 12, 22);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(badgeText, x + 6, y > 24 ? y - 8 : y + 15);

        // 5. Draw Pulse Banner if Object recently crossed line (within 1.5s)
        if (obj.lastCrossedTimestamp && Date.now() - obj.lastCrossedTimestamp < 1500) {
          const crossedType = obj.crossedIn ? 'IN (+1)' : 'OUT (+1)';
          const pulseColor = obj.crossedIn ? '#10b981' : '#ef4444';

          ctx.fillStyle = pulseColor;
          ctx.beginPath();
          ctx.roundRect(cx - 35, cy - 35, 70, 24, 6);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px Outfit, sans-serif';
          ctx.fillText(crossedType, cx - 24, cy - 19);
        }

        detectedLogs.push({
          id: obj.id,
          label: obj.label,
          score: obj.score,
          isStationary: obj.isStationary,
          crossedIn: obj.crossedIn,
          crossedOut: obj.crossedOut,
        });
      });

      const activeCountVal = objects.filter((o) => o.disappeared === 0).length;
      const currentDensity = calculateTrafficDensity(activeCountVal);

      // Update local mini stats state for this specific camera
      setLiveCounts(currentCounts);
      setActiveVehicleCount(activeCountVal);

      // Update Parent Analytics (includes IN count, OUT count, active counts, and crossing events)
      onDetectionUpdate({
        counts: currentCounts,
        inCount: inCountRef.current,
        outCount: outCountRef.current,
        activeCount: activeCountVal,
        inEvents,
        outEvents,
        detectionEvents,
        log: detectedLogs,
      });

      // Emit Socket.IO real-time metrics to backend
      socketService.emit('vehicle_count', {
        cameraId: cameraId || 'default-webcam',
        vehicleCount: activeCountVal,
        counts: currentCounts,
        inCount: inCountRef.current,
        outCount: outCountRef.current,
        timestamp: new Date().toISOString(),
      });

      socketService.emit('traffic_density', {
        cameraId: cameraId || 'default-webcam',
        density: currentDensity,
        vehicleCount: activeCountVal,
        timestamp: new Date().toISOString(),
      });

      // Calculate FPS
      frameCountRef.current++;
      const timeDiff = performance.now() - lastTimeRef.current;
      if (timeDiff >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / timeDiff));
        frameCountRef.current = 0;
        lastTimeRef.current = performance.now();
      }

      if (isSubscribed) {
        reqAnimRef.current = requestAnimationFrame(detectFrame);
      }
    }

    detectFrame();

    return () => {
      isSubscribed = false;
      if (reqAnimRef.current) {
        cancelAnimationFrame(reqAnimRef.current);
      }
    };
  }, [model, isDetecting, lineOrientation, linePositionPercent, showTrajectories]);

  return (
    <div className="glass-panel" style={{ padding: '1.2rem', position: 'relative' }}>
      {/* Header controls bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio color="var(--accent-red)" size={18} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>CCTV Stream & Virtual Line Tracker</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {hasRemoteFeed && (
            <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }}></span>
              Remote Feed
            </span>
          )}
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'rgba(15, 23, 42, 0.8)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            FPS: <strong style={{ color: '#10b981' }}>{fps}</strong>
          </div>
        </div>
      </div>

      {/* VIRTUAL LINE CONFIGURATION CONTROLS PANEL */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '0.8rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Orientation Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Line Type:</span>
          <button
            onClick={() => setLineOrientation('VERTICAL')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: lineOrientation === 'VERTICAL' ? 600 : 400,
              border: lineOrientation === 'VERTICAL' ? '1px solid #f59e0b' : '1px solid var(--border-color)',
              background: lineOrientation === 'VERTICAL' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
              color: lineOrientation === 'VERTICAL' ? '#f59e0b' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ArrowLeftRight size={14} /> Vertical (Khadi)
          </button>
          <button
            onClick={() => setLineOrientation('HORIZONTAL')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: lineOrientation === 'HORIZONTAL' ? 600 : 400,
              border: lineOrientation === 'HORIZONTAL' ? '1px solid #f59e0b' : '1px solid var(--border-color)',
              background: lineOrientation === 'HORIZONTAL' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
              color: lineOrientation === 'HORIZONTAL' ? '#f59e0b' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ArrowUpDown size={14} /> Horizontal (Padi)
          </button>
        </div>

        {/* Dynamic Line Position Slider & Quick Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: '180px', flexWrap: 'wrap' }}>
          <Sliders size={16} color="#f59e0b" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {lineOrientation === 'VERTICAL' ? 'X-Pos' : 'Y-Pos'} ({linePositionPercent}%):
          </span>
          <input
            type="range"
            min="10"
            max="90"
            value={linePositionPercent}
            onChange={(e) => setLinePositionPercent(Number(e.target.value))}
            style={{ flex: 1, minWidth: '100px', cursor: 'pointer', accentColor: '#f59e0b' }}
          />
        </div>

        {/* Quick Position Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Presets:</span>
          {(lineOrientation === 'VERTICAL'
            ? [
              { label: '30%', val: 30 },
              { label: '50%', val: 50 },
              { label: '70%', val: 70 },
            ]
            : [
              { label: '30%', val: 30 },
              { label: '50%', val: 50 },
              { label: '70%', val: 70 },
            ]
          ).map((preset) => (
            <button
              key={preset.val}
              onClick={() => setLinePositionPercent(preset.val)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                border: linePositionPercent === preset.val ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                background: linePositionPercent === preset.val ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: linePositionPercent === preset.val ? '#f59e0b' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Trajectory & Reset Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setShowTrajectories(!showTrajectories)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              border: showTrajectories ? '1px solid #3b82f6' : '1px solid var(--border-color)',
              background: showTrajectories ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: showTrajectories ? '#60a5fa' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Eye size={14} /> Trails
          </button>

          <button
            onClick={handleResetCounters}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Reset IN and OUT Counters"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Video & Canvas Overlay Stream Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: '#000',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <video
          ref={videoRef}
          crossOrigin="anonymous"
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: (hasRemoteFeed || isRtspStream) ? 'none' : 'block',
          }}
        />

        {/* Live Stream Image for RTSP or Remote Device */}
        {(hasRemoteFeed || isRtspStream || Boolean(remoteImageSrc)) && (
          <img
            ref={remoteDisplayImgRef}
            src={remoteImageSrc || mjpegStreamUrl}
            alt="Live Camera Feed"
            crossOrigin="anonymous"
            onLoad={() => {
              setHasRemoteFeed(true);
              setCameraError(null);
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: (hasRemoteFeed || Boolean(remoteImageSrc)) ? 'block' : 'none',
            }}
          />
        )}

        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />

        {/* Waiting for Remote Feed Placeholder */}
        {!hasRemoteFeed && !remoteImageSrc && cameraId !== 'default-webcam' && (!selectedCameraUrl || selectedCameraUrl === 'webcam' || selectedCameraUrl === 'remote-stream') && !cameraError && (
          <div style={{ position: 'absolute', textAlign: 'center', padding: '1.2rem', color: 'var(--text-secondary)', zIndex: 5 }}>
            <Radio size={28} color="#60a5fa" style={{ margin: '0 auto 8px', animation: 'pulse 1.5s infinite' }} />
            <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '4px' }}>Waiting for Remote Device Feed</h4>
            <p style={{ fontSize: '0.78rem', maxWidth: '280px', margin: '0 auto', lineHeight: 1.4 }}>
              Open <span style={{ color: '#60a5fa' }}>https://192.168.1.13:5173</span> on phone/other system and start <strong>Phone Broadcaster</strong> to stream here.
            </p>
          </div>
        )}

        {/* Waiting for RTSP Camera Stream Placeholder */}
        {!hasRemoteFeed && !remoteImageSrc && isRtspStream && !cameraError && (
          <div style={{ position: 'absolute', textAlign: 'center', padding: '1.2rem', color: 'var(--text-secondary)', zIndex: 5 }}>
            <Radio size={28} color="#10b981" style={{ margin: '0 auto 8px', animation: 'pulse 1.5s infinite' }} />
            <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '4px' }}>Connecting to CP PLUS Live Stream...</h4>
            <p style={{ fontSize: '0.78rem', maxWidth: '320px', margin: '0 auto 10px', lineHeight: 1.4 }}>
              Receiving live stream from camera (<strong>192.168.1.23</strong>).
            </p>
            <button
              onClick={() => {
                const targetId = cameraId || 'dfdbafbb-28d3-4cbe-824f-c4752868f6db';
                socketService.emit('request_camera_restart', { cameraId: targetId });
                setRetryTrigger((prev) => prev + 1);
              }}
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
              Ensure your camera is connected and browser permission is allowed, or click "Local Webcam" above.
            </p>
            <button
              onClick={() => {
                setCameraError(null);
                setRetryTrigger((prev) => prev + 1);
                if (isRtspStream) {
                  const targetId = cameraId || 'dfdbafbb-28d3-4cbe-824f-c4752868f6db';
                  socketService.emit('request_camera_restart', { cameraId: targetId });
                }
              }}
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

      {/* Mini Stats Bar directly beneath this Camera (Chhote me live counts for THIS camera) */}
      <div
        style={{
          marginTop: '10px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        {/* Left: IN & OUT counts for THIS specific camera */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>This Camera:</span>
          <span
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginRight: '2px' }}>IN/OUT:</span>
            <strong style={{ color: '#10b981' }}>{_inCount}</strong>
            <span style={{ color: 'var(--text-secondary)', margin: '0 2px' }}>/</span>
            <strong style={{ color: '#ef4444' }}>{_outCount}</strong>
          </span>
          <span
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              color: '#60a5fa',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            Active: {activeVehicleCount}
          </span>
        </div>

        {/* Right: Vehicle Count for THIS specific camera (CAR, TRUCK, BUS, MOTORCYCLE IN / OUT) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.76rem',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              color: '#93c5fd',
              padding: '2px 8px',
              borderRadius: '5px',
            }}
          >
            🚗 Car:{' '}
            <strong style={{ color: '#10b981' }}>{cameraVehicleInOut.CAR?.in || 0}</strong>
            <span style={{ color: 'var(--text-secondary)', margin: '0 2px' }}>/</span>
            <strong style={{ color: '#ef4444' }}>{cameraVehicleInOut.CAR?.out || 0}</strong>
            <span style={{ fontSize: '0.66rem', opacity: 0.8, marginLeft: '3px' }}>(IN/OUT)</span>
          </span>

          <span
            style={{
              fontSize: '0.76rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              padding: '2px 8px',
              borderRadius: '5px',
            }}
          >
            🚚 Truck:{' '}
            <strong style={{ color: '#10b981' }}>{cameraVehicleInOut.TRUCK?.in || 0}</strong>
            <span style={{ color: 'var(--text-secondary)', margin: '0 2px' }}>/</span>
            <strong style={{ color: '#ef4444' }}>{cameraVehicleInOut.TRUCK?.out || 0}</strong>
            <span style={{ fontSize: '0.66rem', opacity: 0.8, marginLeft: '3px' }}>(IN/OUT)</span>
          </span>

          <span
            style={{
              fontSize: '0.76rem',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fcd34d',
              padding: '2px 8px',
              borderRadius: '5px',
            }}
          >
            🚌 Bus:{' '}
            <strong style={{ color: '#10b981' }}>{cameraVehicleInOut.BUS?.in || 0}</strong>
            <span style={{ color: 'var(--text-secondary)', margin: '0 2px' }}>/</span>
            <strong style={{ color: '#ef4444' }}>{cameraVehicleInOut.BUS?.out || 0}</strong>
            <span style={{ fontSize: '0.66rem', opacity: 0.8, marginLeft: '3px' }}>(IN/OUT)</span>
          </span>

          <span
            style={{
              fontSize: '0.76rem',
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              color: '#c4b5fd',
              padding: '2px 8px',
              borderRadius: '5px',
            }}
          >
            🏍️ Bike:{' '}
            <strong style={{ color: '#10b981' }}>{cameraVehicleInOut.MOTORCYCLE?.in || 0}</strong>
            <span style={{ color: 'var(--text-secondary)', margin: '0 2px' }}>/</span>
            <strong style={{ color: '#ef4444' }}>{cameraVehicleInOut.MOTORCYCLE?.out || 0}</strong>
            <span style={{ fontSize: '0.66rem', opacity: 0.8, marginLeft: '3px' }}>(IN/OUT)</span>
          </span>

          {activeVehicleCount > 0 && Object.values(liveCounts).some((c) => c > 0) && (
            <span
              style={{
                fontSize: '0.72rem',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              ● In Frame:{' '}
              {Object.entries(liveCounts)
                .filter(([, c]) => c > 0)
                .map(([k, c]) => `${k}:${c}`)
                .join(', ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
