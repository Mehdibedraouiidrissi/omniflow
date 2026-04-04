'use client';

import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

const TOAST_LIMIT = 5;
const TOAST_DURATION = 5000;

let toastCount = 0;

const listeners: Array<(toasts: Toast[]) => void> = [];
let memoryToasts: Toast[] = [];

function dispatch(toasts: Toast[]) {
  memoryToasts = toasts;
  listeners.forEach((listener) => listener(toasts));
}

export function toast(props: Omit<Toast, 'id'>) {
  const id = String(toastCount++);
  const newToast: Toast = { ...props, id, duration: props.duration ?? TOAST_DURATION };

  dispatch([newToast, ...memoryToasts].slice(0, TOAST_LIMIT));

  const dur = newToast.duration ?? TOAST_DURATION;
  if (dur > 0) {
    setTimeout(() => {
      dispatch(memoryToasts.filter((t) => t.id !== id));
    }, dur);
  }

  return id;
}

export function dismissToast(id: string) {
  dispatch(memoryToasts.filter((t) => t.id !== id));
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(memoryToasts);

  const subscribe = useCallback(() => {
    listeners.push(setToasts);
    return () => {
      const idx = listeners.indexOf(setToasts);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  // Subscribe on first call
  useState(() => {
    listeners.push(setToasts);
    return () => {
      const idx = listeners.indexOf(setToasts);
      if (idx > -1) listeners.splice(idx, 1);
    };
  });

  return {
    toasts,
    toast,
    dismiss: dismissToast,
    subscribe,
  };
}
