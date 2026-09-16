import { useState, useRef, useEffect, useCallback } from 'react';
import { socketClient } from '../../../services/socket/socketClient';
import { SOCKET_EVENTS } from '../../../services/socket/socketEvents';
import { cameraApi } from '../../../services/api';
import { isRtspUrl, isDirectMediaFileUrl } from '../utils/cameraUtils';
import type { CameraType } from '../types/camera.types';

export interface UseCameraStreamOptions {
  cameraId?: string;
  cameraName?: string;
  selectedCameraUrl?: string;
  cameraType?: CameraType | string;
  deviceId?: string;
  autoBroadcastLocal?: boolean;
}

export function useCameraStream({
  cameraId = 'default-webcam',
  selectedCameraUrl = '',
  cameraType = 'WEBCAM',
  deviceId,
  autoBroadcastLocal = true,
}: UseCameraStreamOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteImgRef = useRef<HTMLImageElement | null>(null);
  const localCameraActiveRef = useRef<boolean>(false);
  const broadcastIntervalRef = useRef<any>(null);
  const lastRemoteFrameTimeRef = useRef<number>(0);
  const lastRestartRequestTimeRef = useRef<number>(0);

  const [hasRemoteFeed, setHasRemoteFeed] = useState<boolean>(false);
  const [remoteImageSrc, setRemoteImageSrc] = useState<string>('');
  const [isLocalStreamActive, setIsLocalStreamActive] = useState<boolean>(false);
  const [isBroadcastingLocal, setIsBroadcastingLocal] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  const isRtsp = isRtspUrl(selectedCameraUrl, cameraType);
  const mjpegStreamUrl = isRtsp && cameraId ? cameraApi.getStreamUrl(cameraId) : '';

  // 1. Listen for incoming remote camera frames over Socket.IO
  useEffect(() => {
    const targetCamId = cameraId || 'default-webcam';

    if (!remoteImgRef.current) {
      remoteImgRef.current = new Image();
    }

    const handleRemoteFrame = (data: { cameraId: string; image: string; timestamp: number }) => {
      // Ignore remote frame if this tile has local webcam active to prevent feed collision
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

    const frameEvent = SOCKET_EVENTS.getFrameEvent(targetCamId);
    socketClient.on(frameEvent, handleRemoteFrame);

    // Heartbeat check for remote feed timeout
    const timeoutCheck = setInterval(() => {
      const elapsed = Date.now() - lastRemoteFrameTimeRef.current;
      if (lastRemoteFrameTimeRef.current > 0 && elapsed > 8000) {
        if (isRtsp && Date.now() - lastRestartRequestTimeRef.current > 12000) {
          lastRestartRequestTimeRef.current = Date.now();
          socketClient.emit(SOCKET_EVENTS.REQUEST_CAMERA_RESTART, { cameraId: targetCamId });
        }
        if (elapsed > 15000) {
          setHasRemoteFeed(false);
          setRemoteImageSrc('');
        }
      }
    }, 3000);

    return () => {
      socketClient.off(frameEvent, handleRemoteFrame);
      clearInterval(timeoutCheck);
    };
  }, [cameraId, isRtsp]);

  // 2. Local camera frame broadcast loop to Socket.IO (10 FPS)
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

      socketClient.emit(SOCKET_EVENTS.CAMERA_FRAME_BROADCAST, {
        cameraId: targetCamId,
        image: frameData,
        timestamp: Date.now(),
      });
    }, 100);

    return () => {
      if (broadcastIntervalRef.current) {
        clearInterval(broadcastIntervalRef.current);
        broadcastIntervalRef.current = null;
      }
    };
  }, [isBroadcastingLocal, cameraId]);

  // 3. Hardware / Video Stream Acquisition & Lifecycle
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function initCamera() {
      setCameraError(null);
      if (!videoRef.current) return;

      const isRemoteOnly =
        cameraType === 'USB_PHONE' ||
        selectedCameraUrl === 'remote-stream' ||
        (cameraId && cameraId !== 'default-webcam' && (!selectedCameraUrl || selectedCameraUrl === 'webcam' || selectedCameraUrl === ''));

      if (isRemoteOnly) {
        return;
      }

      const isDefaultWebcam =
        (cameraId === 'default-webcam' || !cameraId) &&
        (!selectedCameraUrl || selectedCameraUrl === 'webcam' || selectedCameraUrl === '');
      const isSpecificSecondaryHardware = Boolean(deviceId && deviceId !== 'webcam' && deviceId.trim().length > 0);
      const isMediaFile = isDirectMediaFileUrl(selectedCameraUrl);

      // Clean up previous stream tracks
      if (videoRef.current.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        if (oldStream.getTracks) {
          oldStream.getTracks().forEach((track) => track.stop());
        }
        videoRef.current.srcObject = null;
      }
      videoRef.current.removeAttribute('src');

      if (isRtsp) {
        setCameraError(null);
      } else if (isDefaultWebcam || isSpecificSecondaryHardware) {
        const targetDeviceId =
          deviceId || (selectedCameraUrl !== 'webcam' && selectedCameraUrl !== '' ? selectedCameraUrl : undefined);

        const constraintsToTry: any[] = [];
        if (targetDeviceId && targetDeviceId.trim().length > 0) {
          constraintsToTry.push({ video: { deviceId: { exact: targetDeviceId } } });
          constraintsToTry.push({ video: { deviceId: { ideal: targetDeviceId } } });
        }
        constraintsToTry.push({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } });
        constraintsToTry.push({ video: true });

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (!hasRemoteFeed) {
            setCameraError('Camera blocked: Allow camera permissions in browser settings.');
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
              localCameraActiveRef.current = true;
              setIsLocalStreamActive(true);
              if (autoBroadcastLocal) {
                setIsBroadcastingLocal(true);
              }
              setCameraError(null);
              break;
            }
          } catch (err) {
            console.warn('getUserMedia constraint attempt failed:', constraints, err);
          }
        }

        if (!acquired && !hasRemoteFeed) {
          setCameraError('Camera is busy or permission not granted. Click "Retry Stream" below.');
        }
      } else if (isMediaFile && selectedCameraUrl) {
        videoRef.current.src = selectedCameraUrl;
        videoRef.current
          .play()
          .then(() => setIsLocalStreamActive(true))
          .catch(() => {
            if (!hasRemoteFeed) {
              setCameraError('Unable to play video stream URL.');
            }
          });
      }
    }

    initCamera();

    const videoElem = videoRef.current;

    return () => {
      localCameraActiveRef.current = false;
      setIsLocalStreamActive(false);
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
      if (videoElem && videoElem.srcObject) {
        const oldStream = videoElem.srcObject as MediaStream;
        if (oldStream.getTracks) {
          oldStream.getTracks().forEach((track) => track.stop());
        }
        videoElem.srcObject = null;
      }
    };
  }, [selectedCameraUrl, cameraType, deviceId, retryTrigger, cameraId, isRtsp, autoBroadcastLocal, hasRemoteFeed]);

  const retryStream = useCallback(() => {
    setCameraError(null);
    setRetryTrigger((prev) => prev + 1);
    if (isRtsp && cameraId) {
      socketClient.emit(SOCKET_EVENTS.REQUEST_CAMERA_RESTART, { cameraId });
    }
  }, [isRtsp, cameraId]);

  const isCameraRunning =
    !cameraError &&
    (hasRemoteFeed ||
      Boolean(remoteImageSrc) ||
      isLocalStreamActive ||
      localCameraActiveRef.current ||
      Boolean(videoRef.current && videoRef.current.readyState >= 2));

  return {
    videoRef,
    remoteImgRef,
    hasRemoteFeed,
    remoteImageSrc,
    mjpegStreamUrl,
    isLocalStreamActive,
    isBroadcastingLocal,
    setIsBroadcastingLocal,
    cameraError,
    setCameraError,
    isCameraRunning,
    isRtspStream: isRtsp,
    retryStream,
  };
}
