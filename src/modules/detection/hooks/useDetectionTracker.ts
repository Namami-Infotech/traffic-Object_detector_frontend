import { useRef, useEffect, useState, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { CentroidTracker } from '../utils/centroidTracker';
import { drawVirtualLine, drawTrackedObjects } from '../utils/canvasDrawUtils';
import { detectionService } from '../services/detectionService';
import { socketClient } from '../../../services/socket/socketClient';
import { SOCKET_EVENTS } from '../../../services/socket/socketEvents';
import { TRAFFIC_CONFIG, calculateTrafficDensity } from '../../../app/config/traffic.config';
import type { LineConfig, DetectionUpdateData } from '../types/detection.types';

export interface UseDetectionTrackerOptions {
  cameraId: string;
  model: cocoSsd.ObjectDetection | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  remoteImgRef: React.RefObject<HTMLImageElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  lineConfig: LineConfig;
  showTrajectories?: boolean;
  isDetecting?: boolean;
  hasRemoteFeed: boolean;
  isLocalStreamActive: boolean;
  onDetectionUpdate?: (data: DetectionUpdateData) => void;
  initialInCount?: number;
  initialOutCount?: number;
  initialVehicleInOut?: Record<string, { in: number; out: number }>;
}

export function useDetectionTracker({
  cameraId,
  model,
  videoRef,
  remoteImgRef,
  canvasRef,
  lineConfig,
  showTrajectories = true,
  isDetecting = true,
  hasRemoteFeed,
  isLocalStreamActive,
  onDetectionUpdate,
  initialInCount = 0,
  initialOutCount = 0,
  initialVehicleInOut,
}: UseDetectionTrackerOptions) {
  const trackerRef = useRef<CentroidTracker>(new CentroidTracker());
  const inCountRef = useRef<number>(initialInCount);
  const outCountRef = useRef<number>(initialOutCount);
  const lastDetectTimeRef = useRef<number>(0);
  const reqAnimRef = useRef<number | null>(null);

  const [inCount, setInCount] = useState<number>(initialInCount);
  const [outCount, setOutCount] = useState<number>(initialOutCount);
  const [activeVehicleCount, setActiveVehicleCount] = useState<number>(0);
  const [liveCounts, setLiveCounts] = useState<Record<string, number>>({});
  const [vehicleInOut, setVehicleInOut] = useState<Record<string, { in: number; out: number }>>(
    initialVehicleInOut || {
      CAR: { in: 0, out: 0 },
      TRUCK: { in: 0, out: 0 },
      BUS: { in: 0, out: 0 },
      MOTORCYCLE: { in: 0, out: 0 },
      PERSON: { in: 0, out: 0 },
    }
  );

  // Sync initial counts when provided from DB
  useEffect(() => {
    if (initialInCount > inCountRef.current) {
      inCountRef.current = initialInCount;
      setInCount(initialInCount);
    }
    if (initialOutCount > outCountRef.current) {
      outCountRef.current = initialOutCount;
      setOutCount(initialOutCount);
    }
  }, [initialInCount, initialOutCount]);

  useEffect(() => {
    if (initialVehicleInOut) {
      setVehicleInOut((prev) => ({ ...prev, ...initialVehicleInOut }));
    }
  }, [initialVehicleInOut]);

  const updateVehicleTally = useCallback((label: string, direction?: 'IN' | 'OUT') => {
    const upper = label.toUpperCase();
    if (['CAR', 'TRUCK', 'BUS', 'MOTORCYCLE', 'PERSON'].includes(upper) && direction) {
      setVehicleInOut((prev) => {
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
  }, []);

  // Main Detection Loop
  useEffect(() => {
    if (!model || !isDetecting) return;

    let isSubscribed = true;

    async function detectFrame() {
      const activeImg = remoteImgRef.current;
      const isRemoteActive = hasRemoteFeed && activeImg && activeImg.naturalWidth > 0;
      const isLocalActive = isLocalStreamActive && videoRef.current && videoRef.current.readyState >= 2;

      if (!isRemoteActive && !isLocalActive) {
        if (isSubscribed) {
          reqAnimRef.current = requestAnimationFrame(detectFrame);
        }
        return;
      }

      const now = performance.now();
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

      const sourceWidth = (isRemoteActive && activeImg ? activeImg.naturalWidth : videoRef.current?.videoWidth) || 640;
      const sourceHeight = (isRemoteActive && activeImg ? activeImg.naturalHeight : videoRef.current?.videoHeight) || 480;

      let rawPredictions: any[] = [];

      try {
        if (isRemoteActive && activeImg) {
          rawPredictions = await model.detect(activeImg, 30, TRAFFIC_CONFIG.AI.CONFIDENCE_THRESHOLD);
        } else if (isLocalActive && videoRef.current) {
          rawPredictions = await model.detect(videoRef.current, 30, TRAFFIC_CONFIG.AI.CONFIDENCE_THRESHOLD);
        }
      } catch (err) {
        console.warn('Inference error:', err);
      }

      const allowedClasses = TRAFFIC_CONFIG.AI.ALLOWED_CLASSES;
      const predictions = rawPredictions.filter((p) => allowedClasses.includes(p.class.toLowerCase()));

      const { objects, inEvents, outEvents, detectionEvents } = trackerRef.current.update(
        predictions,
        lineConfig,
        sourceWidth,
        sourceHeight
      );

      // Save confirmed vehicle detection to DB
      if (detectionEvents.length > 0) {
        detectionEvents.forEach((evt) => {
          updateVehicleTally(evt.label);
          detectionService.logEvent({
            cameraId: cameraId || 'default-webcam',
            vehicleType: (evt.label || 'car').toUpperCase(),
            trackId: evt.id,
            event: 'DETECTION',
            confidence: evt.score || 0.95,
            count: 1,
            inCount: inCountRef.current,
            outCount: outCountRef.current,
          });
        });
      }

      // Handle IN line crossing events
      if (inEvents.length > 0) {
        inCountRef.current += inEvents.length;
        const currentIn = inCountRef.current;
        setInCount(currentIn);
        inEvents.forEach((evt) => {
          updateVehicleTally(evt.label, 'IN');
          detectionService.logEvent({
            cameraId: cameraId || 'default-webcam',
            vehicleType: (evt.label || 'car').toUpperCase(),
            trackId: evt.id,
            event: 'IN',
            confidence: (evt as any).score || 0.95,
            count: 1,
            inCount: currentIn,
            outCount: outCountRef.current,
          });
        });
      }

      // Handle OUT line crossing events
      if (outEvents.length > 0) {
        outCountRef.current += outEvents.length;
        const currentOut = outCountRef.current;
        setOutCount(currentOut);
        outEvents.forEach((evt) => {
          updateVehicleTally(evt.label, 'OUT');
          detectionService.logEvent({
            cameraId: cameraId || 'default-webcam',
            vehicleType: (evt.label || 'car').toUpperCase(),
            trackId: evt.id,
            event: 'OUT',
            confidence: (evt as any).score || 0.95,
            count: 1,
            inCount: inCountRef.current,
            outCount: currentOut,
          });
        });
      }

      // Render crisp canvas matching physical display resolution in fullscreen & normal mode
      const rect = canvas.getBoundingClientRect();
      const clientW = Math.round(rect.width || canvas.clientWidth || sourceWidth);
      const clientH = Math.round(rect.height || canvas.clientHeight || sourceHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const targetW = Math.round(clientW * dpr);
      const targetH = Math.round(clientH * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.scale(dpr, dpr);

      // Coordinate mapping from native video space to canvas CSS display space
      const scaleX = clientW / sourceWidth;
      const scaleY = clientH / sourceHeight;

      // Virtual line position in display space
      const lineCoordDisplay =
        lineConfig.orientation === 'HORIZONTAL'
          ? (clientH * lineConfig.positionPercent) / 100
          : (clientW * lineConfig.positionPercent) / 100;

      drawVirtualLine(ctx, clientW, clientH, lineConfig, lineCoordDisplay);

      // Map tracked objects into display coordinates to mark precisely on top of detected objects
      const displayObjects: any[] = objects.map((obj) => ({
        ...obj,
        bbox: [
          obj.bbox[0] * scaleX,
          obj.bbox[1] * scaleY,
          obj.bbox[2] * scaleX,
          obj.bbox[3] * scaleY,
        ],
        centroid: [
          obj.centroid[0] * scaleX,
          obj.centroid[1] * scaleY,
        ],
        trajectory: obj.trajectory.map(([tx, ty]) => [
          tx * scaleX,
          ty * scaleY,
        ]),
      }));

      drawTrackedObjects(ctx, displayObjects, showTrajectories);
      ctx.restore();

      // Compute current counts by class
      const currentClassCounts: Record<string, number> = {
        car: 0,
        bus: 0,
        truck: 0,
        motorcycle: 0,
        person: 0,
        bicycle: 0,
      };

      objects.forEach((obj) => {
        if (obj.disappeared === 0) {
          const lbl = obj.label.toLowerCase();
          if (currentClassCounts.hasOwnProperty(lbl)) {
            currentClassCounts[lbl] += 1;
          }
        }
      });

      const activeCountVal = objects.filter((o) => o.disappeared === 0).length;
      const currentDensity = calculateTrafficDensity(activeCountVal);

      setLiveCounts(currentClassCounts);
      setActiveVehicleCount(activeCountVal);

      onDetectionUpdate?.({
        counts: currentClassCounts,
        inCount: inCountRef.current,
        outCount: outCountRef.current,
        activeCount: activeCountVal,
        inEvents,
        outEvents,
        detectionEvents,
        log: objects,
      });

      // Socket.IO metrics broadcast
      socketClient.emit(SOCKET_EVENTS.VEHICLE_COUNT, {
        cameraId: cameraId || 'default-webcam',
        vehicleCount: activeCountVal,
        counts: currentClassCounts,
        inCount: inCountRef.current,
        outCount: outCountRef.current,
        timestamp: new Date().toISOString(),
      });

      socketClient.emit(SOCKET_EVENTS.TRAFFIC_DENSITY, {
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
  }, [
    model,
    isDetecting,
    lineConfig,
    showTrajectories,
    hasRemoteFeed,
    isLocalStreamActive,
    cameraId,
    updateVehicleTally,
    onDetectionUpdate,
  ]);

  return {
    inCount,
    outCount,
    activeVehicleCount,
    liveCounts,
    vehicleInOut,
  };
}
