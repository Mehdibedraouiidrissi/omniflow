import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const ADMIN_TOKEN_KEY = 'omniflow_admin_token';

export interface ApiErrorResponse {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

const api = axios.create({
  baseURL: `${API_URL}/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        window.location.href = '/login';
      }
    }

    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  },
);

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<{ data: T }>(url, config);
  return response.data.data;
}

export async function apiPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.post<{ data: T }>(url, data, config);
  return response.data.data;
}

export async function apiPut<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.put<{ data: T }>(url, data, config);
  return response.data.data;
}

export async function apiPatch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.patch<{ data: T }>(url, data, config);
  return response.data.data;
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.delete<{ data: T }>(url, config);
  return response.data.data;
}

export default api;

/* ---- typed admin API calls ---- */

export interface AdminStats {
  totalTenants: number;
  totalUsers: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  tenantGrowth: number;
  userGrowth: number;
  revenueGrowth: number;
  subscriptionGrowth: number;
}

export interface TenantsByPlan {
  plan: string;
  count: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
}

export interface RecentSignup {
  id: string;
  name: string;
  email: string;
  plan: string;
  createdAt: string;
}

export interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  service: string;
  timestamp: string;
}

export interface DashboardData {
  stats: AdminStats;
  tenantsByPlan: TenantsByPlan[];
  revenueData: RevenueDataPoint[];
  recentSignups: RecentSignup[];
  alerts: SystemAlert[];
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: 'business' | 'agency' | 'enterprise';
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'trial' | 'inactive';
  userCount: number;
  contactCount: number;
  email: string;
  createdAt: string;
  limits: {
    contacts: number;
    emails: number;
    sms: number;
    storage: number;
  };
  usage: {
    contacts: number;
    emails: number;
    sms: number;
    storage: number;
  };
}

export interface TenantMember {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
  status: 'active' | 'inactive';
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  tenantName: string;
  tenantId: string;
  role: string;
  lastLogin: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface BillingMetrics {
  mrr: number;
  arr: number;
  churnRate: number;
  arpu: number;
  mrrGrowth: number;
  newSubscriptions: number;
  cancelledSubscriptions: number;
}

export interface SubscriptionByPlan {
  plan: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface Transaction {
  id: string;
  tenantName: string;
  amount: number;
  currency: string;
  status: 'paid' | 'failed' | 'pending' | 'refunded';
  plan: string;
  createdAt: string;
}

export interface QueueStats {
  name: string;
  displayName: string;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface FailedJob {
  id: string;
  queue: string;
  name: string;
  failedAt: string;
  reason: string;
  attempts: number;
  data: Record<string, unknown>;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rules: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  tenantId: string;
  tenantName: string;
  action: string;
  entity: string;
  entityId: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  uptime?: number;
  lastChecked: string;
  details?: Record<string, unknown>;
}

export interface SystemHealth {
  services: ServiceHealth[];
  database: {
    connections: number;
    maxConnections: number;
    slowQueries: number;
    queryTime: number;
  };
  redis: {
    usedMemory: number;
    maxMemory: number;
    keys: number;
    hitRate: number;
    connectedClients: number;
  };
  api: {
    p50: number;
    p95: number;
    p99: number;
    requestsPerMin: number;
    errorRate: number;
  };
  uptime: number;
}

export interface PlatformSettings {
  general: {
    platformName: string;
    supportEmail: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  email: {
    provider: string;
    host: string;
    port: number;
    from: string;
    status: 'connected' | 'error';
  };
  sms: {
    provider: string;
    accountSid: string;
    status: 'connected' | 'error';
  };
  storage: {
    provider: string;
    bucket: string;
    region: string;
    usedBytes: number;
    totalBytes: number;
  };
  plans: Array<{
    id: string;
    name: string;
    price: number;
    interval: 'monthly' | 'yearly';
    features: string[];
    limits: {
      contacts: number;
      emails: number;
      sms: number;
      storage: number;
      users: number;
    };
  }>;
}
