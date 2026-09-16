/**
 * Centralized Socket.IO Event Constants
 * Matching existing backend events 100% without modification
 */
export const SOCKET_EVENTS = {
  // Client Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',

  // Vehicle & Detection Events
  VEHICLE_DETECTED: 'vehicle_detected',
  VEHICLE_COUNT: 'vehicle_count',
  TRAFFIC_DENSITY: 'traffic_density',

  // Camera & Stream Events
  CAMERA_STATUS: 'camera_status',
  CAMERA_ERROR: 'camera_error',
  CAMERA_FRAME_BROADCAST: 'camera_frame_broadcast',
  CAMERA_BROADCASTER_STATUS: 'camera_broadcaster_status',
  REQUEST_CAMERA_RESTART: 'request_camera_restart',

  // Frame event generator for specific camera
  getFrameEvent: (cameraId: string) => `camera_frame_${cameraId}`,
} as const;

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
