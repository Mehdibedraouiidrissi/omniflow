'use client';

import * as React from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { getMe, isAuthenticated } from '@/lib/auth';
import { FullPageSpinner } from '@/components/ui/spinner';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, clearAuth, isLoading } = useAuthStore();
  const initialized = React.useRef(false);

  React.useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function init() {
      if (!isAuthenticated()) {
        setLoading(false);
        return;
      }

      try {
        const user = await getMe();
        setUser(user);
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [setUser, setLoading, clearAuth]);

  if (isLoading) {
    return <FullPageSpinner />;
  }

  return <>{children}</>;
}
