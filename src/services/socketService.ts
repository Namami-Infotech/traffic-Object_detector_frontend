import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../routes/config';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      const url =
        API_BASE_URL && API_BASE_URL.length > 0
          ? API_BASE_URL
          : typeof window !== 'undefined'
            ? window.location.origin
            : '';

      this.socket = io(url, {
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

