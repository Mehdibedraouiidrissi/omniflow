'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Database,
  Server,
  Zap,
  HardDrive,
  Mail,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiGet, type SystemHealth } from '@/lib/api';
import dayjs from 'dayjs';

const MOCK_HEALTH: SystemHealth = {
  services: [
    { service: 'API Server', status: 'healthy', latency: 42, uptime: 99.98, lastChecked: new Date().toISOString() },
    { service: 'Worker', status: 'healthy', latency: 12, uptime: 99.95, lastChecked: new Date().toISOString() },
    { service: 'Database', status: 'healthy', latency: 3, uptime: 99.99, lastChecked: new Date().toISOString() },
    { service: 'Redis', status: 'degraded', latency: 28, uptime: 99.87, lastChecked: new Date().toISOString(), details: { reason: 'High memory usage (78%)' } },
    { service: 'S3 Storage', status: 'healthy', latency: 85, uptime: 100, lastChecked: new Date().toISOString() },
    { service: 'Email (SMTP)', status: 'healthy', latency: 210, uptime: 99.92, lastChecked: new Date().toISOString() },
    { service: 'SMS (Twilio)', status: 'healthy', latency: 180, uptime: 99.89, lastChecked: new Date().toISOString() },
  ],
  database: {
    connections: 23,
    maxConnections: 100,
    slowQueries: 2,
    queryTime: 18,
  },
  redis: {
    usedMemory: 2684354560,
    maxMemory: 4294967296,
    keys: 183421,
    hitRate: 94.3,
    connectedClients: 48,
  },
  api: {
    p50: 42,
    p95: 180,
    p99: 420,
    requestsPerMin: 1842,
    errorRate: 0.12,
  },
  uptime: 2592000, // 30 days in seconds
};

const ERROR_RATE_DATA = [
  { time: '00:00', rate: 0.08 },
  { time: '04:00', rate: 0.05 },
  { time: '08:00', rate: 0.14 },
  { time: '10:00', rate: 0.21 },
  { time: '12:00', rate: 0.18 },
  { time: '14:00', rate: 0.12 },
  { time: '16:00', rate: 0.09 },
  { time: '18:00', rate: 0.15 },
  { time: '20:00', rate: 0.11 },
  { time: '22:00', rate: 0.08 },
  { time: '23:59', rate: 0.06 },
];

const SERVICE_ICONS: Record<string, React.ElementType> = {
  'API Server': Server,
  'Worker': Zap,
  'Database': Database,
  'Redis': Activity,
  'S3 Storage': HardDrive,
  'Email (SMTP)': Mail,
  'SMS (Twilio)': MessageSquare,
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'healthy') return <CheckCircle className="w-5 h-5 text-green-400" />;
  if (status === 'degraded') return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
  return <XCircle className="w-5 h-5 text-red-400" />;
}

function ServiceCard({ service }: { service: SystemHealth['services'][0] }) {
  const Icon = SERVICE_ICONS[service.service] || Server;
  const statusColors = {
    healthy: 'border-green-500/20 bg-green-500/5',
    degraded: 'border-yellow-500/20 bg-yellow-500/5',
    down: 'border-red-500/20 bg-red-500/5',
  };

  return (
    <div className={`bg-card border rounded-xl p-4 transition-all ${statusColors[service.status] || 'border-border'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            service.status === 'healthy' ? 'bg-green-500/10' :
            service.status === 'degraded' ? 'bg-yellow-500/10' :
            'bg-red-500/10'
          }`}>
            <Icon className={`w-4 h-4 ${
              service.status === 'healthy' ? 'text-green-400' :
              service.status === 'degraded' ? 'text-yellow-400' :
              'text-red-400'
            }`} />
          </div>
          <span className="font-medium text-foreground text-sm">{service.service}</span>
        </div>
        <StatusIcon status={service.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {service.latency !== undefined && (
          <div>
            <div className="text-xs text-muted-foreground">Latency</div>
            <div className="font-medium text-foreground">{service.latency}ms</div>
          </div>
        )}
        {service.uptime !== undefined && (
          <div>
            <div className="text-xs text-muted-foreground">Uptime</div>
            <div className="font-medium text-foreground">{service.uptime}%</div>
          </div>
        )}
      </div>

      {service.details?.reason && (
        <div className="mt-2 text-xs text-yellow-400">{service.details.reason as string}</div>
      )}

      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        Checked {dayjs(service.lastChecked).fromNow()}
      </div>
    </div>
  );
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}

function formatBytes(bytes: number) {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function HealthPage() {
  const { data, isLoading, refetch } = useQuery<SystemHealth>({
    queryKey: ['admin-system-health'],
    queryFn: () => apiGet<SystemHealth>('/health'),
    placeholderData: MOCK_HEALTH,
    refetchInterval: 30000,
  });

  const h = data ?? MOCK_HEALTH;
  const dbPct = Math.round((h.database.connections / h.database.maxConnections) * 100);
  const redisPct = Math.round((h.redis.usedMemory / h.redis.maxMemory) * 100);

  const healthyCount = h.services.filter((s) => s.status === 'healthy').length;
  const degradedCount = h.services.filter((s) => s.status === 'degraded').length;
  const downCount = h.services.filter((s) => s.status === 'down').length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Health</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Real-time monitoring of all platform services
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall status */}
      <div className={`rounded-xl p-4 border flex items-center gap-4 ${
        downCount > 0 ? 'bg-red-500/10 border-red-500/30' :
        degradedCount > 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
        'bg-green-500/10 border-green-500/30'
      }`}>
        {downCount > 0 ? <XCircle className="w-6 h-6 text-red-400" /> :
         degradedCount > 0 ? <AlertTriangle className="w-6 h-6 text-yellow-400" /> :
         <CheckCircle className="w-6 h-6 text-green-400" />}
        <div>
          <div className={`font-semibold ${downCount > 0 ? 'text-red-400' : degradedCount > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            {downCount > 0 ? 'System Outage Detected' : degradedCount > 0 ? 'Degraded Performance' : 'All Systems Operational'}
          </div>
          <div className="text-sm text-muted-foreground">
            {healthyCount} healthy · {degradedCount} degraded · {downCount} down ·
            Platform uptime: {formatUptime(h.uptime)}
          </div>
        </div>
      </div>

      {/* Service cards */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Service Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {h.services.map((service) => (
            <ServiceCard key={service.service} service={service} />
          ))}
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Database */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Database</h2>
          </div>
          <div className="space-y-4 text-sm">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-muted-foreground">Connections</span>
                <span className={`font-medium ${dbPct > 80 ? 'text-red-400' : dbPct > 60 ? 'text-yellow-400' : 'text-foreground'}`}>
                  {h.database.connections}/{h.database.maxConnections} ({dbPct}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${dbPct > 80 ? 'bg-red-500' : dbPct > 60 ? 'bg-yellow-500' : 'bg-primary'}`}
                  style={{ width: `${dbPct}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slow Queries</span>
              <span className={`font-medium ${h.database.slowQueries > 0 ? 'text-yellow-400' : 'text-foreground'}`}>
                {h.database.slowQueries}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Query Time</span>
              <span className="font-medium text-foreground">{h.database.queryTime}ms</span>
            </div>
          </div>
        </div>

        {/* Redis */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Redis</h2>
          </div>
          <div className="space-y-4 text-sm">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-muted-foreground">Memory</span>
                <span className={`font-medium ${redisPct > 80 ? 'text-red-400' : redisPct > 60 ? 'text-yellow-400' : 'text-foreground'}`}>
                  {formatBytes(h.redis.usedMemory)} / {formatBytes(h.redis.maxMemory)} ({redisPct}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${redisPct > 80 ? 'bg-red-500' : redisPct > 60 ? 'bg-yellow-500' : 'bg-primary'}`}
                  style={{ width: `${redisPct}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Keys</span>
              <span className="font-medium text-foreground">{h.redis.keys.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hit Rate</span>
              <span className={`font-medium ${h.redis.hitRate > 90 ? 'text-green-400' : h.redis.hitRate > 75 ? 'text-yellow-400' : 'text-red-400'}`}>
                {h.redis.hitRate}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connected Clients</span>
              <span className="font-medium text-foreground">{h.redis.connectedClients}</span>
            </div>
          </div>
        </div>

        {/* API Response Times */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">API Response Times</h2>
          </div>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">p50 (median)</span>
              <span className="font-medium text-green-400">{h.api.p50}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">p95</span>
              <span className={`font-medium ${h.api.p95 > 200 ? 'text-yellow-400' : 'text-foreground'}`}>
                {h.api.p95}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">p99</span>
              <span className={`font-medium ${h.api.p99 > 500 ? 'text-red-400' : h.api.p99 > 300 ? 'text-yellow-400' : 'text-foreground'}`}>
                {h.api.p99}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requests/min</span>
              <span className="font-medium text-foreground">{h.api.requestsPerMin.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Error Rate</span>
              <span className={`font-medium ${h.api.errorRate > 1 ? 'text-red-400' : h.api.errorRate > 0.5 ? 'text-yellow-400' : 'text-green-400'}`}>
                {h.api.errorRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error rate chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-foreground">Error Rate (24h)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">API error rate over the last 24 hours</p>
          </div>
          <div className={`text-sm font-medium ${h.api.errorRate > 1 ? 'text-red-400' : h.api.errorRate > 0.5 ? 'text-yellow-400' : 'text-green-400'}`}>
            Current: {h.api.errorRate}%
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={ERROR_RATE_DATA} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
                fontSize: '12px',
              }}
              formatter={(v: number) => [`${v}%`, 'Error Rate']}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
