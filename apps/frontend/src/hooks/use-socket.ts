import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { useAuthStore } from '../stores/auth.store';

type EventHandler = (payload: unknown) => void;

export function useSocket(event?: string, handler?: EventHandler) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket();

    if (event && handlerRef.current) {
      const cb = (payload: unknown) => handlerRef.current?.(payload);
      socket.on(event, cb);
      return () => { socket.off(event, cb); };
    }

    return undefined;
  }, [isAuthenticated, event]);
}
