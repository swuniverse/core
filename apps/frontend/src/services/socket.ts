import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = useAuthStore.getState().accessToken;
  socket = io('/game', {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.debug('[WS] connected');
  });

  socket.on('disconnect', (reason) => {
    console.debug('[WS] disconnected:', reason);
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
