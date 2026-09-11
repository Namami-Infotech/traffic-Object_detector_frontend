import React, { useRef, useEffect, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { AlertCircle, Radio, Sliders, ArrowLeftRight, ArrowUpDown, MapPin, Navigation, Maximize2, Minimize2 } from 'lucide-react';
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
  cameraName?: string;
  location?: string;
  lane?: string;
  direction?: string;
  deviceId?: string;
  onDetectionUpdate: (data: DetectionUpdateData) => void;
  onModelLoaded: (loaded: boolean) => void;
}

export const CctvViewer: React.FC<CctvViewerProps> = ({
  selectedCameraUrl,
  cameraType,
  cameraId,
  cameraName,
  location,
  lane,
  direction,
  deviceId,
  onDetectionUpdate,
  onModelLoaded,
}) => {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackerRef = useRef<CentroidTracker>(new CentroidTracker());

  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isDetecting] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLocalStreamActive, setIsLocalStreamActive] = useState<boolean>(false);

  // Virtual Line & Tracking Settings State (Default VERTICAL - Khadi Line)
  const isRtspStream = Boolean(
    selectedCameraUrl &&
    (selectedCameraUrl.startsWith('rtsp://') || selectedCameraUrl.startsWith('rtsps://') || cameraType === 'IP_RTSP')
  );
  const mjpegStreamUrl = isRtspStream && cameraId ? `${API_BASE_URL || ''}/api/v1/cctv/cameras/${cameraId}/stream` : '';

  const [lineOrientation, setLineOrientation] = useState<'VERTICAL' | 'HORIZONTAL'>('HORIZONTAL');
  const [linePositionPercent, setLinePositionPercent] = useState<number>(50); // 50% screen position
  const [showTrajectories] = useState<boolean>(true);

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

  const lastDetectTimeRef = useRef<number>(0);
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

  // Camera running status: active when receiving remote stream or local webcam is streaming
  const isCameraRunning =
    !cameraError &&
    (hasRemoteFeed ||
      Boolean(remoteImageSrc) ||
      isLocalStreamActive ||
      localCameraActiveRef.current ||
      Boolean(videoRef.current && videoRef.current.readyState >= 2));

  // Fullscreen Handlers
  const exitFullscreenMode = () => {
    setIsFullscreen(false);
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Native exitFullscreen failed:', err);
    }
  };

  const toggleFullscreen = async () => {
    if (!isCameraRunning) return;

    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        const elem = viewerContainerRef.current;
        if (elem && !document.fullscreenElement) {
          if (elem.requestFullscreen) {
            await elem.requestFullscreen();
          } else if ((elem as any).webkitRequestFullscreen) {
            await (elem as any).webkitRequestFullscreen();
          }
        }
      } catch (err) {
        console.warn('Native requestFullscreen failed or blocked, continuing with fixed overlay:', err);
      }
    } else {
      exitFullscreenMode();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        exitFullscreenMode();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

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
              setIsLocalStreamActive(true);
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
        videoRef.current.play().then(() => {
          setIsLocalStreamActive(true);
        }).catch(() => {
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
      localCameraActiveRef.current = false;
      setIsLocalStreamActive(false);
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
        ctx.fillRect(15, lineCoord - 26, 210, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`FULL-BODY LINE (${linePositionPercent}%)`, 22, lineCoord - 10);

        // Direction Badges (IN / OUT)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.85)'; // Green IN
        ctx.fillRect(canvas.width - 125, lineCoord + 6, 110, 22);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('▼ IN (Full Body)', canvas.width - 119, lineCoord + 21);

        ctx.fillStyle = 'rgba(239, 68, 68, 0.85)'; // Red OUT
        ctx.fillRect(canvas.width - 125, lineCoord - 28, 110, 22);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('▲ OUT (Full Body)', canvas.width - 119, lineCoord - 13);
      } else {
        // Vertical Line
        ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
        ctx.fillRect(lineCoord - 95, 15, 190, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`FULL-BODY LINE (${linePositionPercent}%)`, lineCoord - 88, 31);

        // IN / OUT Badges
        ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
        ctx.fillRect(lineCoord + 6, 50, 120, 22);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('IN (Full Body) ►', lineCoord + 12, 65);

        ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.fillRect(lineCoord - 126, 50, 120, 22);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('◄ OUT (Full Body)', lineCoord - 120, 65);
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
        ctx.strokeStyle = obj.isCrossing ? '#f59e0b' : baseColor;
        ctx.lineWidth = obj.isCrossing ? 3.5 : (obj.isStationary ? 2 : 3);
        ctx.strokeRect(x, y, width, height);

        // 3. Draw Centroid Dot
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = obj.isCrossing ? '#f59e0b' : baseColor;
        ctx.stroke();

        // 4. Draw Header Badge (CLASS + UNIQUE TRACK ID + STABLE / CROSSING INDICATOR)
        let statusBadge = '';
        if (obj.isStationary) {
          statusBadge = ' [STABLE]';
        } else if (obj.isCrossing) {
          statusBadge = ' [CROSSING LINE...]';
        } else if (obj.crossedIn) {
          statusBadge = ' [FULL BODY IN]';
        } else if (obj.crossedOut) {
          statusBadge = ' [FULL BODY OUT]';
        }

        const badgeText = `${obj.label.toUpperCase()} #${obj.id} ${Math.round(obj.score * 100)}%${statusBadge}`;
        ctx.font = 'bold 13px Outfit, sans-serif';
        const textWidth = ctx.measureText(badgeText).width;

        // Background box for label badge
        ctx.fillStyle = obj.isCrossing ? '#d97706' : (obj.isStationary ? '#475569' : baseColor);
        ctx.fillRect(x, y > 24 ? y - 24 : y, textWidth + 12, 22);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(badgeText, x + 6, y > 24 ? y - 8 : y + 15);

        // 5. Draw Pulse Banner if Object recently crossed line (within 2s)
        if (obj.lastCrossedTimestamp && Date.now() - obj.lastCrossedTimestamp < 2000) {
          const crossedType = obj.crossedIn ? 'FULL BODY IN (+1)' : 'FULL BODY OUT (+1)';
          const pulseColor = obj.crossedIn ? '#10b981' : '#ef4444';

          ctx.fillStyle = pulseColor;
          ctx.beginPath();
          ctx.roundRect(cx - 65, cy - 35, 130, 26, 6);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(crossedType, cx, cy - 18);
          ctx.textAlign = 'start';
        }

        detectedLogs.push({
          id: obj.id,
          label: obj.label,
          score: obj.score,
          isStationary: obj.isStationary,
          isCrossing: obj.isCrossing,
          fullBodyCrossed: obj.fullBodyCrossed,
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
    <div
      ref={viewerContainerRef}
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
      {/* Header controls bar: Left side has Header Camera info, Right side has Camera Stats & Tallies */}
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
        {/* Left Side: Header info (Camera Name, Location, Lane) */}
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
          {lane && (
            <span
              style={{
                fontSize: '0.75rem',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '2px 7px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 500,
              }}
            >
              <Navigation size={12} color="#10b981" />
              {lane} {direction ? `(${direction})` : ''}
            </span>
          )}
        </div>

        {/* Right Side: Camera Counts, Active, Vehicle breakdown & Fullscreen toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* This Camera IN / OUT */}
          <span
            style={{
              background: isFullscreen ? 'rgba(255, 255, 255, 0.08)' : '#f8fafc',
              border: isFullscreen ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--border-color)',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: isFullscreen ? '#ffffff' : 'inherit',
            }}
          >
            <span style={{ color: isFullscreen ? '#cbd5e1' : 'var(--text-secondary)', fontSize: '0.72rem' }}>
              IN/OUT:
            </span>
            <strong style={{ color: '#059669' }}>{_inCount}</strong>
            <span style={{ color: 'var(--text-muted)', margin: '0 1px' }}>/</span>
            <strong style={{ color: '#dc2626' }}>{_outCount}</strong>
          </span>

          {/* Active in Frame */}
          <span
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              padding: '3px 7px',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: 700,
            }}
          >
            Active: {activeVehicleCount}
          </span>

          {/* Vehicle mini badges */}
          <span
            style={{
              fontSize: '0.74rem',
              background: '#eff6ff',
              border: '1px solid #dbeafe',
              color: '#1e40af',
              padding: '2px 6px',
              borderRadius: '5px',
            }}
          >
            🚗 <strong style={{ color: '#059669' }}>{cameraVehicleInOut.CAR?.in || 0}</strong>/<strong style={{ color: '#dc2626' }}>{cameraVehicleInOut.CAR?.out || 0}</strong>
          </span>

          <span
            style={{
              fontSize: '0.74rem',
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#991b1b',
              padding: '2px 6px',
              borderRadius: '5px',
            }}
          >
            🚚 <strong style={{ color: '#059669' }}>{cameraVehicleInOut.TRUCK?.in || 0}</strong>/<strong style={{ color: '#dc2626' }}>{cameraVehicleInOut.TRUCK?.out || 0}</strong>
          </span>

          <span
            style={{
              fontSize: '0.74rem',
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              color: '#92400e',
              padding: '2px 6px',
              borderRadius: '5px',
            }}
          >
            🚌 <strong style={{ color: '#059669' }}>{cameraVehicleInOut.BUS?.in || 0}</strong>/<strong style={{ color: '#dc2626' }}>{cameraVehicleInOut.BUS?.out || 0}</strong>
          </span>

          <span
            style={{
              fontSize: '0.74rem',
              background: '#f5f3ff',
              border: '1px solid #ede9fe',
              color: '#5b21b6',
              padding: '2px 6px',
              borderRadius: '5px',
            }}
          >
            🏍️ <strong style={{ color: '#059669' }}>{cameraVehicleInOut.MOTORCYCLE?.in || 0}</strong>/<strong style={{ color: '#dc2626' }}>{cameraVehicleInOut.MOTORCYCLE?.out || 0}</strong>
          </span>

          {((cameraVehicleInOut.PERSON?.in || 0) > 0 || (cameraVehicleInOut.PERSON?.out || 0) > 0) && (
            <span
              style={{
                fontSize: '0.74rem',
                background: '#ecfeff',
                border: '1px solid #cffafe',
                color: '#0e7490',
                padding: '2px 6px',
                borderRadius: '5px',
              }}
            >
              🚶 <strong style={{ color: '#059669' }}>{cameraVehicleInOut.PERSON?.in || 0}</strong>/<strong style={{ color: '#dc2626' }}>{cameraVehicleInOut.PERSON?.out || 0}</strong>
            </span>
          )}

          {activeVehicleCount > 0 && Object.values(liveCounts).some((c) => c > 0) && (
            <span
              style={{
                fontSize: '0.72rem',
                color: '#065f46',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
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

          {hasRemoteFeed && (
            <span
              style={{
                fontSize: '0.74rem',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                padding: '3px 7px',
                borderRadius: '6px',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
              Remote
            </span>
          )}

          {/* Fullscreen Button in Header */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            disabled={!isCameraRunning}
            title={
              isFullscreen
                ? 'Exit Fullscreen (ESC)'
                : isCameraRunning
                ? 'Click to expand to Fullscreen'
                : 'Camera not streaming'
            }
            style={{
              background: isFullscreen ? '#ef4444' : isCameraRunning ? '#eff6ff' : '#f8fafc',
              border: isFullscreen ? '1px solid #dc2626' : isCameraRunning ? '1px solid #bfdbfe' : '1px solid var(--border-color)',
              color: isFullscreen ? '#ffffff' : isCameraRunning ? '#2563eb' : 'var(--text-secondary)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: isCameraRunning ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              opacity: isCameraRunning ? 1 : 0.5,
              transition: 'all 0.2s ease',
            }}
          >
            {isFullscreen ? (
              <>
                <Minimize2 size={13} />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 size={13} />
                <span>Full Screen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* VIRTUAL LINE CONFIGURATION CONTROLS PANEL */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: isFullscreen ? '0.5rem 0.8rem' : '0.8rem 1rem',
          marginBottom: isFullscreen ? '0.6rem' : '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: isFullscreen ? '0.6rem' : '1rem',
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
              border: lineOrientation === 'VERTICAL' ? '1px solid #d97706' : '1px solid var(--border-color)',
              background: lineOrientation === 'VERTICAL' ? '#fef3c7' : '#ffffff',
              color: lineOrientation === 'VERTICAL' ? '#b45309' : 'var(--text-secondary)',
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
              border: lineOrientation === 'HORIZONTAL' ? '1px solid #d97706' : '1px solid var(--border-color)',
              background: lineOrientation === 'HORIZONTAL' ? '#fef3c7' : '#ffffff',
              color: lineOrientation === 'HORIZONTAL' ? '#b45309' : 'var(--text-secondary)',
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
          <Sliders size={16} color="#d97706" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {lineOrientation === 'VERTICAL' ? 'X-Pos' : 'Y-Pos'} ({linePositionPercent}%):
          </span>
          <input
            type="range"
            min="10"
            max="90"
            value={linePositionPercent}
            onChange={(e) => setLinePositionPercent(Number(e.target.value))}
            style={{ flex: 1, minWidth: '100px', cursor: 'pointer', accentColor: '#d97706' }}
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
                border: linePositionPercent === preset.val ? '1px solid #d97706' : '1px solid var(--border-color)',
                background: linePositionPercent === preset.val ? '#fef3c7' : '#ffffff',
                color: linePositionPercent === preset.val ? '#b45309' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

      
      </div>

      {/* Video & Canvas Overlay Stream Container */}
      <div
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, input, a')) return;
          if (isCameraRunning) {
            toggleFullscreen();
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
        <video
          ref={videoRef}
          crossOrigin="anonymous"
          muted
          playsInline
          onPlaying={() => setIsLocalStreamActive(true)}
          onLoadedData={() => setIsLocalStreamActive(true)}
          onPause={() => setIsLocalStreamActive(false)}
          onEnded={() => setIsLocalStreamActive(false)}
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

        {/* Floating badge for running camera when NOT fullscreen */}
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

    </div>
  );
};
