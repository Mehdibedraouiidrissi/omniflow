'use client';

import * as React from 'react';
import { useSocket } from '@/hooks/use-socket';
import { useNotificationStore } from '@/stores/notification-store';

interface SocketNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { subscribe } = useSocket();
  const addNotification = useNotificationStore((s) => s.addNotification);

  React.useEffect(() => {
    const unsubNotification = subscribe<SocketNotification>('notification', (data) => {
      addNotification({
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link,
      });
    });

    return () => {
      unsubNotification();
    };
  }, [subscribe, addNotification]);

  return <>{children}</>;
}
