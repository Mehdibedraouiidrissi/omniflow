'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Users,
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { apiGet, type DashboardData } from '@/lib/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const PLAN_COLORS: Record<string, string> = {
  free: '#6B7280',
  starter: '#3B82F6',
  pro: '#8B5CF6',
  enterprise: '#F59E0B',
};

const PLAN_DISPLAY: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

// Mock data for demo
const MOCK_DATA: DashboardData = {
  stats: {
    totalTenants: 1247,
    totalUsers: 8934,
    monthlyRevenue: 142850,
    activeSubscriptions: 1089,
    tenantGrowth: 12.4,
    userGrowth: 8.7,
    revenueGrowth: 18.2,
    subscriptionGrowth: 9.1,
  },
  tenantsByPlan: [
    { plan: 'free', count: 423 },
    { plan: 'starter', count: 389 },
    { plan: 'pro', count: 312 },
    { plan: 'enterprise', count: 123 },
  ],
  revenueData: [
    { month: 'May', revenue: 98200 },
    { month: 'Jun', revenue: 104500 },
    { month: 'Jul', revenue: 112000 },
    { month: 'Aug', revenue: 108700 },
    { month: 'Sep', revenue: 118300 },
    { month: 'Oct', revenue: 124600 },
    { month: 'Nov', revenue: 119800 },
    { month: 'Dec', revenue: 131200 },
    { month: 'Jan', revenue: 128500 },
    { month: 'Feb', revenue: 135900 },
    { month: 'Mar', revenue: 139200 },
    { month: 'Apr', revenue: 142850 },
  ],
  recentSignups: [
    { id: '1', name: 'Acme Corp', email: 'admin@acme.com', plan: 'pro', createdAt: new Date(Date.now() - 1800000).toISOString() },
    { id: '2', name: 'TechFlow Inc', email: 'hello@techflow.io', plan: 'enterprise', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: '3', name: 'Startup Hub', email: 'team@startuphub.co', plan: 'starter', createdAt: new Date(Date.now() - 14400000).toISOString() },
    { id: '4', name: 'Digital Agency', email: 'ops@digital.agency', plan: 'pro', createdAt: new Date(Date.now() - 21600000).toISOString() },
    { id: '5', name: 'Cloud Ventures', email: 'admin@cloudv.com', plan: 'free', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: '6', name: 'Nexify Ltd', email: 'hello@nexify.io', plan: 'starter', createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: '7', name: 'DataSphere', email: 'team@datasphere.ai', plan: 'enterprise', createdAt: new Date(Date.now() - 259200000).toISOString() },
    { id: '8', name: 'GreenTech', email: 'admin@greentech.co', plan: 'pro', createdAt: new Date(Date.now() - 345600000).toISOString() },
  ],
  alerts: [
    { id: '1', type: 'error', message: 'High error rate in email queue (8.2% failure)', service: 'Email Queue', timestamp: new Date(Date.now() - 900000).toISOString() },
    { id: '2', type: 'warning', message: 'Redis memory usage at 78% capacity', service: 'Redis', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: '3', type: 'info', message: 'Database backup completed successfully', service: 'Database', timestamp: new Date(Date.now() - 7200000).toISOString() },
  ],
};

function StatCard({
  title,
  value,
  growth,
  icon: Icon,
  color,
  prefix = '',
  suffix = '',
}: {
  title: string;
  value: number;
  growth: number;
  icon: React.ElementType;
  color: string;
  prefix?: string;
  suffix?: string;
}) {
  const isPositive = growth >= 0;
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            isPositive
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(growth)}%
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">
        {prefix}
        {value >= 1000000
          ? `${(value / 1000000).toFixed(1)}M`
          : value >= 1000
          ? `${(value / 1000).toFixed(1)}K`
          : value.toLocaleString()}
        {suffix}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{title}</div>
    </div>
  );
}

function AlertItem({ alert }: { alert: DashboardData['alerts'][0] }) {
  const icons = {
    error: <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />,
  };
  const colors = {
    error: 'border-red-500/20 bg-red-500/5',
    warning: 'border-yellow-500/20 bg-yellow-500/5',
    info: 'border-blue-500/20 bg-blue-500/5',
  };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${colors[alert.type]}`}>
      {icons[alert.type]}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground">{alert.message}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{alert.service}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{dayjs(alert.timestamp).fromNow()}</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiGet<DashboardData>('/dashboard'),
    placeholderData: MOCK_DATA,
  });

  const dashboard = data ?? MOCK_DATA;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Overview of all platform metrics and activity
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Tenants"
          value={dashboard.stats.totalTenants}
          growth={dashboard.stats.tenantGrowth}
          icon={Building2}
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          title="Total Users"
          value={dashboard.stats.totalUsers}
          growth={dashboard.stats.userGrowth}
          icon={Users}
          color="bg-purple-500/10 text-purple-400"
        />
        <StatCard
          title="Monthly Revenue"
          value={dashboard.stats.monthlyRevenue}
          growth={dashboard.stats.revenueGrowth}
          icon={DollarSign}
          color="bg-green-500/10 text-green-400"
          prefix="$"
        />
        <StatCard
          title="Active Subscriptions"
          value={dashboard.stats.activeSubscriptions}
          growth={dashboard.stats.subscriptionGrowth}
          icon={CreditCard}
          color="bg-orange-500/10 text-orange-400"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue trend */}
        <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-foreground">Revenue Trend</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last 12 months</p>
            </div>
            <div className="text-sm font-medium text-green-400">
              +{dashboard.stats.revenueGrowth}% vs last month
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dashboard.revenueData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tenants by plan */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="mb-5">
            <h2 className="font-semibold text-foreground">Tenants by Plan</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Distribution across plans</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={dashboard.tenantsByPlan}
                dataKey="count"
                nameKey="plan"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
              >
                {dashboard.tenantsByPlan.map((entry) => (
                  <Cell
                    key={entry.plan}
                    fill={PLAN_COLORS[entry.plan] || '#6B7280'}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [value, PLAN_DISPLAY[name] || name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {dashboard.tenantsByPlan.map((item) => (
              <div key={item.plan} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: PLAN_COLORS[item.plan] || '#6B7280' }}
                  />
                  <span className="text-muted-foreground">{PLAN_DISPLAY[item.plan] || item.plan}</span>
                </div>
                <span className="font-medium text-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent signups */}
        <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-foreground">Recent Signups</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last 10 new tenants</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-3 text-xs font-medium text-muted-foreground">Tenant</th>
                  <th className="text-left pb-3 text-xs font-medium text-muted-foreground">Email</th>
                  <th className="text-left pb-3 text-xs font-medium text-muted-foreground">Plan</th>
                  <th className="text-right pb-3 text-xs font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dashboard.recentSignups.map((signup) => (
                  <tr key={signup.id} className="table-row-hover transition-colors">
                    <td className="py-3 font-medium text-foreground">{signup.name}</td>
                    <td className="py-3 text-muted-foreground">{signup.email}</td>
                    <td className="py-3">
                      <span className={`badge badge-${signup.plan}`}>
                        {PLAN_DISPLAY[signup.plan] || signup.plan}
                      </span>
                    </td>
                    <td className="py-3 text-right text-muted-foreground text-xs">
                      {dayjs(signup.createdAt).fromNow()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System alerts */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-foreground">System Alerts</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Recent issues & notifications</p>
            </div>
            {dashboard.alerts.some((a) => a.type === 'error') && (
              <span className="badge badge-suspended text-xs">
                {dashboard.alerts.filter((a) => a.type === 'error').length} Error
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {dashboard.alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No active alerts
              </div>
            ) : (
              dashboard.alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
