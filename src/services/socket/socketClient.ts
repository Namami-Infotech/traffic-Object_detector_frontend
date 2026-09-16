import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../../app/config/env.config';
import { SOCKET_EVENTS } from './socketEvents';

class SocketClient {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (!this.socket) {
      let socketHost = typeof window !== 'undefined' ? window.location.origin : '';
      let socketPath = '/socket.io';

      if (API_BASE_URL && API_BASE_URL.length > 0) {
        try {
          const urlObj = new URL(
            API_BASE_URL,
            typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
          );
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

      this.socket.on(SOCKET_EVENTS.CONNECT, () => {
        console.log('⚡ Socket.IO Connected to Server:', this.socket?.id);
      });

      this.socket.on(SOCKET_EVENTS.CONNECT_ERROR, (err) => {
        console.warn('⚠️ Socket.IO Connection Error:', err.message);
      });

      this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
        console.warn('⚠️ Socket.IO Disconnected:', reason);
      });
    }

    return this.socket;
  }

  getSocket(): Socket | null {
    if (!this.socket) this.connect();
    return this.socket;
  }

  isConnected(): boolean {
    return Boolean(this.socket && this.socket.connected);
  }

  emit(event: string, data: any): void {
    if (!this.socket) this.connect();
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.socket) this.connect();
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void): void {
    this.socket?.off(event, callback);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketClient = new SocketClient();
// Backward compatibility alias for existing code
export const socketService = socketClient;
