import { io, Socket } from 'socket.io-client';
import { WS_URL, AUTH_TOKEN_KEY } from './constants';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const token = typeof window !== 'undefined'
    ? localStorage.getItem(AUTH_TOKEN_KEY)
    : null;

  socket = io(WS_URL, {
    auth: { token },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.info('[Socket] Connected');
  });

  socket.on('disconnect', (reason) => {
    console.info('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onSocketEvent<T>(event: string, callback: (data: T) => void): () => void {
  const s = getSocket();
  s.on(event, callback);
  return () => {
    s.off(event, callback);
  };
}

export function emitSocketEvent(event: string, data?: unknown): void {
  const s = getSocket();
  if (s.connected) {
    s.emit(event, data);
  }
}
