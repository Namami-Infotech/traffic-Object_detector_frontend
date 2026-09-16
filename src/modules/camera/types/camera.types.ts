export type CameraType = 'WEBCAM' | 'USB_PHONE' | 'IP_RTSP' | 'DROIDCAM' | 'FILE';

export interface CameraItem {
  id: string;
  cameraName: string;
  location: string;
  rtspUrl: string;
  cameraType?: CameraType | string;
  lane?: string;
  direction?: string;
  status?: string;
  enabled?: boolean;
}

export interface VideoDeviceInfo {
  deviceId: string;
  label: string;
}

export type LineOrientation = 'VERTICAL' | 'HORIZONTAL';

export interface CameraStreamState {
  hasRemoteFeed: boolean;
  remoteImageSrc: string;
  isLocalStreamActive: boolean;
  isBroadcastingLocal: boolean;
  cameraError: string | null;
  isCameraRunning: boolean;
}
