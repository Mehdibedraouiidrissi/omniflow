'use client';

import { useEffect, useRef, useCallback } from 'react';
import { connectSocket, disconnectSocket, onSocketEvent } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth-store';

export function useSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !connectedRef.current) {
      connectSocket();
      connectedRef.current = true;
    }

    return () => {
      if (connectedRef.current) {
        disconnectSocket();
        connectedRef.current = false;
      }
    };
  }, [isAuthenticated]);

  const subscribe = useCallback(
    <T>(event: string, callback: (data: T) => void): (() => void) => {
      return onSocketEvent<T>(event, callback);
    },
    [],
  );

  return { subscribe };
}
