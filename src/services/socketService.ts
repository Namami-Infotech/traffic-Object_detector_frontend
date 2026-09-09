import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../routes/config';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      let socketHost = typeof window !== 'undefined' ? window.location.origin : '';
      let socketPath = '/socket.io';

      if (API_BASE_URL && API_BASE_URL.length > 0) {
        try {
          const urlObj = new URL(API_BASE_URL, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
          socketHost = urlObj.origin;
          const cleanPath = urlObj.pathname.replace(/\/$/, '');
          if (cleanPath && cleanPath !== '/') {
            socketPath = `${cleanPath}/socket.io`;
          }
        } catch {
          socketHost = API_BASE_URL;
        }
      }

      this.socket = io(socketHost, {
        path: socketPath,
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('⚡ Socket.IO Connected to Server:', this.socket?.id);
      });

      this.socket.on('connect_error', (err) => {
        console.warn('⚠️ Socket.IO Connection Error:', err.message);
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('⚠️ Socket.IO Disconnected:', reason);
      });
    }
    return this.socket;
  }

  getSocket(): Socket | null {
    if (!this.socket) this.connect();
    return this.socket;
  }

  emit(event: string, data: any) {
    if (!this.socket) this.connect();
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.socket) this.connect();
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void) {
    this.socket?.off(event, callback);
  }
}

export const socketService = new SocketService();

