// =============================================================================
// useAuth Hook Tests
// =============================================================================

import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import * as authLib from '@/lib/auth';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    back: jest.fn(),
    forward: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock('@/lib/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  getMe: jest.fn(),
  refreshToken: jest.fn(),
}));

// Reset zustand store between tests
const initialStoreState = useAuthStore.getState();

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState(initialStoreState, true);
  });

  // =========================================================================
  // Initial state
  // =========================================================================

  describe('initial state', () => {
    it('should return unauthenticated state by default', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should expose all expected methods', () => {
      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.register).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.refreshSession).toBe('function');
      expect(typeof result.current.switchTenant).toBe('function');
    });
  });

  // =========================================================================
  // login
  // =========================================================================

  describe('login', () => {
    const mockLoginResponse = {
      user: {
        id: 'user_1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        status: 'ACTIVE',
        memberships: [
          {
            id: 'mem_1',
            role: 'admin',
            tenant: {
              id: 'tenant_1',
              name: 'Test Tenant',
              slug: 'test-tenant',
              type: 'BUSINESS',
              status: 'ACTIVE',
              logoUrl: null,
            },
          },
        ],
      },
      tokens: {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
      },
    };

    it('should login and update store', async () => {
      (authLib.login as jest.Mock).mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(authLib.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      // Store should be updated
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockLoginResponse.user);
      expect(state.accessToken).toBe('access_token_123');
      expect(state.refreshToken).toBe('refresh_token_456');
    });

    it('should redirect to /dashboard after login', async () => {
      (authLib.login as jest.Mock).mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should handle login failure', async () => {
      (authLib.login as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials'),
      );

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.login({
            email: 'bad@example.com',
            password: 'wrong',
          });
        }),
      ).rejects.toThrow('Invalid credentials');

      // Store should remain unauthenticated
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should set loading to false after login completes', async () => {
      (authLib.login as jest.Mock).mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading to false even on failure', async () => {
      (authLib.login as jest.Mock).mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useAuth());

      try {
        await act(async () => {
          await result.current.login({
            email: 'fail@example.com',
            password: 'fail',
          });
        });
      } catch {
        // Expected
      }

      expect(result.current.isLoading).toBe(false);
    });
  });

  // =========================================================================
  // register
  // =========================================================================

  describe('register', () => {
    const mockRegisterResponse = {
      user: {
        id: 'user_new',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        avatarUrl: null,
        status: 'ACTIVE',
        memberships: [
          {
            id: 'mem_1',
            role: 'admin',
            tenant: {
              id: 'tenant_new',
              name: 'New Corp',
              slug: 'new-corp',
              type: 'BUSINESS',
              status: 'TRIAL',
              logoUrl: null,
            },
          },
        ],
      },
      tokens: {
        accessToken: 'new_access',
        refreshToken: 'new_refresh',
      },
    };

    it('should register and update store', async () => {
      (authLib.register as jest.Mock).mockResolvedValue(mockRegisterResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.register({
          email: 'new@example.com',
          password: 'NewPass123!',
          firstName: 'New',
          lastName: 'User',
          companyName: 'New Corp',
          accountType: 'BUSINESS',
        });
      });

      expect(authLib.register).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/dashboard');

      const state = useAuthStore.getState();
      expect(state.user?.email).toBe('new@example.com');
      expect(state.accessToken).toBe('new_access');
    });

    it('should handle registration failure', async () => {
      (authLib.register as jest.Mock).mockRejectedValue(
        new Error('Email already exists'),
      );

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.register({
            email: 'existing@example.com',
            password: 'Pass123!',
            firstName: 'Dup',
            lastName: 'User',
            companyName: 'Corp',
            accountType: 'BUSINESS',
          });
        }),
      ).rejects.toThrow('Email already exists');

      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  // =========================================================================
  // logout
  // =========================================================================

  describe('logout', () => {
    it('should clear auth state and redirect to login', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: { id: 'u1' } as any,
        accessToken: 'token',
        refreshToken: 'refresh',
        isAuthenticated: true,
      });

      (authLib.logout as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(authLib.logout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should clear auth state even if API logout fails', async () => {
      useAuthStore.setState({
        user: { id: 'u1' } as any,
        accessToken: 'token',
        isAuthenticated: true,
      });

      (authLib.logout as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      // Should still clear state and redirect
      expect(mockPush).toHaveBeenCalledWith('/login');
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  // =========================================================================
  // refreshSession
  // =========================================================================

  describe('refreshSession', () => {
    it('should refresh user data from API', async () => {
      const meResponse = {
        id: 'u1',
        email: 'refreshed@example.com',
        firstName: 'Refreshed',
        lastName: 'User',
        avatarUrl: null,
        status: 'ACTIVE',
        memberships: [],
      };

      (authLib.getMe as jest.Mock).mockResolvedValue(meResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshSession();
      });

      const state = useAuthStore.getState();
      expect(state.user?.email).toBe('refreshed@example.com');
    });

    it('should clear auth if refresh fails', async () => {
      useAuthStore.setState({
        user: { id: 'u1' } as any,
        isAuthenticated: true,
      });

      (authLib.getMe as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshSession();
      });

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should set loading to false after refresh', async () => {
      (authLib.getMe as jest.Mock).mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        memberships: [],
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshSession();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  // =========================================================================
  // switchTenant
  // =========================================================================

  describe('switchTenant', () => {
    it('should switch to another tenant from memberships', () => {
      const user = {
        id: 'u1',
        email: 'multi@example.com',
        firstName: 'Multi',
        lastName: 'Tenant',
        avatarUrl: null,
        status: 'ACTIVE',
        memberships: [
          {
            id: 'mem_1',
            role: 'admin',
            tenant: {
              id: 'tenant_1',
              name: 'Tenant A',
              slug: 'tenant-a',
              type: 'BUSINESS',
              status: 'ACTIVE',
              logoUrl: null,
            },
          },
          {
            id: 'mem_2',
            role: 'member',
            tenant: {
              id: 'tenant_2',
              name: 'Tenant B',
              slug: 'tenant-b',
              type: 'BUSINESS',
              status: 'ACTIVE',
              logoUrl: null,
            },
          },
        ],
      };

      useAuthStore.setState({
        user: user as any,
        isAuthenticated: true,
        tenant: user.memberships[0]!.tenant as any,
      });

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.switchTenant('tenant_2');
      });

      const state = useAuthStore.getState();
      expect(state.tenant?.id).toBe('tenant_2');
      expect(state.tenant?.name).toBe('Tenant B');
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should not switch if tenant not found in memberships', () => {
      const user = {
        id: 'u1',
        email: 'test@test.com',
        memberships: [
          {
            id: 'mem_1',
            role: 'admin',
            tenant: { id: 'tenant_1', name: 'Only One', slug: 'only', type: 'BUSINESS', status: 'ACTIVE', logoUrl: null },
          },
        ],
      };

      useAuthStore.setState({
        user: user as any,
        isAuthenticated: true,
        tenant: user.memberships[0]!.tenant as any,
      });

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.switchTenant('nonexistent_tenant');
      });

      // Should not change
      expect(useAuthStore.getState().tenant?.id).toBe('tenant_1');
      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });
});
