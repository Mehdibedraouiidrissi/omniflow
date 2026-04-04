import { apiGet, apiPost } from './api';
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from './constants';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  status: string;
  memberships: Array<{
    id: string;
    role: string;
    tenant: {
      id: string;
      name: string;
      slug: string;
      type: string;
      status: string;
      logoUrl: string | null;
    };
  }>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  accountType: 'AGENCY' | 'BUSINESS';
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const result = await apiPost<{ user: AuthUser; tokens: AuthTokens }>('/auth/login', payload);
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, result.tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.tokens.refreshToken);
  }
  return result;
}

export async function register(payload: RegisterPayload): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const result = await apiPost<{ user: AuthUser; tokens: AuthTokens }>('/auth/register', payload);
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, result.tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.tokens.refreshToken);
  }
  return result;
}

export async function logout(): Promise<void> {
  try {
    await apiPost('/auth/logout');
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }
}

export async function refreshToken(): Promise<AuthTokens> {
  const currentRefresh = typeof window !== 'undefined'
    ? localStorage.getItem(REFRESH_TOKEN_KEY)
    : null;

  const result = await apiPost<AuthTokens>('/auth/refresh', {
    refreshToken: currentRefresh,
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_TOKEN_KEY, result.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
  }

  return result;
}

export async function getMe(): Promise<AuthUser> {
  return apiGet<AuthUser>('/auth/me');
}

export async function forgotPassword(email: string): Promise<void> {
  await apiPost('/auth/forgot-password', { email });
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  await apiPost('/auth/reset-password', payload);
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(AUTH_TOKEN_KEY);
}
