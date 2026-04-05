'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import * as authLib from '@/lib/auth';
import type { LoginPayload, RegisterPayload } from '@/lib/auth';

export function useAuth() {
  const router = useRouter();
  const {
    user,
    tenant,
    isAuthenticated,
    isLoading,
    setUser,
    setTenant,
    setTokens,
    setLoading,
    clearAuth,
  } = useAuthStore();

  const login = useCallback(
    async (payload: LoginPayload) => {
      setLoading(true);
      try {
        const result = await authLib.login(payload);
        setUser(result.user);
        setTenant(result.tenant);
        setTokens(result.accessToken, result.refreshToken);
        router.push('/dashboard');
        return result;
      } finally {
        setLoading(false);
      }
    },
    [router, setUser, setTenant, setTokens, setLoading],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      setLoading(true);
      try {
        const result = await authLib.register(payload);
        setUser(result.user);
        setTenant(result.tenant);
        setTokens(result.accessToken, result.refreshToken);
        router.push('/dashboard');
        return result;
      } finally {
        setLoading(false);
      }
    },
    [router, setUser, setTenant, setTokens, setLoading],
  );

  const logout = useCallback(async () => {
    try {
      await authLib.logout();
    } finally {
      clearAuth();
      router.push('/login');
    }
  }, [clearAuth, router]);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    try {
      const me = await authLib.getMe();
      setUser(me);
    } catch {
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [setUser, clearAuth, setLoading]);

  const switchTenant = useCallback(
    (tenantId: string) => {
      const membership = user?.memberships.find((m) => m.tenant.id === tenantId);
      if (membership) {
        setTenant(membership.tenant);
        router.refresh();
      }
    },
    [user, setTenant, router],
  );

  return {
    user,
    tenant,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshSession,
    switchTenant,
  };
}
