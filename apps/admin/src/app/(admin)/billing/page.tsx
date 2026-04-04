'use client';

import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  AlertCircle,
  RefreshCw,
  CheckCircle,
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
  BarChart,
  Bar,
} from 'recharts';
import { apiGet, type BillingMetrics, type SubscriptionByPlan, type Transaction } from '@/lib/api';
import dayjs from 'dayjs';

const MOCK_METRICS: BillingMetrics = {
  mrr: 142850,
  arr: 1714200,
  churnRate: 2.3,
  arpu: 131.2,
  mrrGrowth: 18.2,
  newSubscriptions: 48,
  cancelledSubscriptions: 11,
};

const MOCK_PLANS: SubscriptionByPlan[] = [
  { plan: 'Free', count: 423, revenue: 0, percentage: 33.9 },
  { plan: 'Starter', count: 389, revenue: 38511, percentage: 31.2 },
  { plan: 'Pro', count: 312, revenue: 77688, percentage: 25.0 },
  { plan: 'Enterprise', count: 123, revenue: 117123, percentage: 9.9 },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'txn-1', tenantName: 'TechFlow Inc', amount: 299, currency: 'USD', status: 'paid', plan: 'Enterprise', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'txn-2', tenantName: 'Acme Corp', amount: 99, currency: 'USD', status: 'paid', plan: 'Pro', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'txn-3', tenantName: 'Startup Hub', amount: 29, currency: 'USD', status: 'failed', plan: 'Starter', createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: 'txn-4', tenantName: 'Digital Agency', amount: 99, currency: 'USD', status: 'paid', plan: 'Pro', createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 'txn-5', tenantName: 'Cloud Ventures', amount: 29, currency: 'USD', status: 'pending', plan: 'Starter', createdAt: new Date(Date.now() - 18000000).toISOString() },
  { id: 'txn-6', tenantName: 'DataSphere', amount: 299, currency: 'USD', status: 'paid', plan: 'Enterprise', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'txn-7', tenantName: 'GreenTech', amount: 99, currency: 'USD', status: 'refunded', plan: 'Pro', createdAt: new Date(Date.now() - 172800000).toISOString() },
];

const REVENUE_TREND = [
  { month: 'Nov', mrr: 119800 },
  { month: 'Dec', mrr: 131200 },
  { month: 'Jan', mrr: 128500 },
  { month: 'Feb', mrr: 135900 },
  { month: 'Mar', mrr: 139200 },
  { month: 'Apr', mrr: 142850 },
];

function MetricCard({
  title,
  value,
  growth,
  icon: Icon,
  format = 'number',
  suffix = '',
}: {
  title: string;
  value: number;
  growth?: number;
  icon: React.ElementType;
  format?: 'currency' | 'percent' | 'number';
  suffix?: string;
}) {
  const fmt = () => {
    if (format === 'currency') return `$${value >= 1000000 ? `${(value / 1000000).toFixed(2)}M` : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toFixed(0)}`;
    if (format === 'percent') return `${value.toFixed(1)}%`;
    return `${value.toLocaleString()}${suffix}`;
  };

  return (
    <div className="metric-card">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{fmt()}</div>
      {growth !== undefined && (
        <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(growth)}% vs last month
        </div>
      )}
    </div>
  );
}

function TransactionStatus({ status }: { status: string }) {
  const config = {
    paid: { icon: CheckCircle, class: 'text-green-400', label: 'Paid' },
    failed: { icon: XCircle, class: 'text-red-400', label: 'Failed' },
    pending: { icon: Clock, class: 'text-yellow-400', label: 'Pending' },
    refunded: { icon: AlertCircle, class: 'text-blue-400', label: 'Refunded' },
  }[status] || { icon: AlertCircle, class: 'text-muted-foreground', label: status };

  const Icon = config.icon;
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${config.class}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

export default function BillingPage() {
  const { data: metrics, isLoading, refetch } = useQuery<BillingMetrics>({
    queryKey: ['admin-billing-metrics'],
    queryFn: () => apiGet<BillingMetrics>('/billing/metrics'),
    placeholderData: MOCK_METRICS,
  });

  const { data: plans } = useQuery<SubscriptionByPlan[]>({
    queryKey: ['admin-billing-plans'],
    queryFn: () => apiGet<SubscriptionByPlan[]>('/billing/subscriptions-by-plan'),
    placeholderData: MOCK_PLANS,
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['admin-billing-transactions'],
    queryFn: () => apiGet<Transaction[]>('/billing/transactions?limit=10'),
    placeholderData: MOCK_TRANSACTIONS,
  });

  const m = metrics ?? MOCK_METRICS;
  const planList = plans ?? MOCK_PLANS;
  const txList = transactions ?? MOCK_TRANSACTIONS;

  const failedTx = txList.filter((t) => t.status === 'failed');

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing Overview</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Revenue, subscriptions and payment activity</p>
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

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard title="Monthly Recurring Revenue" value={m.mrr} growth={m.mrrGrowth} icon={DollarSign} format="currency" />
        <MetricCard title="Annual Recurring Revenue" value={m.arr} icon={TrendingUp} format="currency" />
        <MetricCard title="Monthly Churn Rate" value={m.churnRate} icon={TrendingDown} format="percent" />
        <MetricCard title="Avg Revenue Per User" value={m.arpu} icon={Users} format="currency" />
      </div>

      {/* New vs cancelled */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">New Subscriptions (month)</span>
            <span className="text-2xl font-bold text-green-400">+{m.newSubscriptions}</span>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Cancellations (month)</span>
            <span className="text-2xl font-bold text-red-400">-{m.cancelledSubscriptions}</span>
          </div>
        </div>
      </div>

      {/* Charts and table */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* MRR trend */}
        <div className="xl:col-span-2 bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">MRR Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={REVENUE_TREND} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))', fontSize: '12px' }}
                formatter={(v: number) => [`$${v.toLocaleString()}`, 'MRR']}
              />
              <Line type="monotone" dataKey="mrr" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Plans breakdown */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Revenue by Plan</h2>
          <div className="space-y-3">
            {planList.map((plan) => (
              <div key={plan.plan} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{plan.plan}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{plan.count} tenants</span>
                    <span className="font-medium text-foreground">${plan.revenue.toLocaleString()}</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${plan.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={planList} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                <XAxis dataKey="plan" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))', fontSize: '11px' }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tenant</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Plan</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {txList.map((tx) => (
                <tr key={tx.id} className="table-row-hover transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{tx.tenantName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tx.plan}</td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    ${tx.amount}/{tx.currency === 'USD' ? 'mo' : tx.currency}
                  </td>
                  <td className="px-4 py-3">
                    <TransactionStatus status={tx.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {dayjs(tx.createdAt).format('MMM D, YYYY HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Failed payments */}
      {failedTx.length > 0 && (
        <div className="bg-card border border-red-500/20 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-red-500/20 bg-red-500/5 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <h2 className="font-semibold text-red-400">Failed Payments ({failedTx.length})</h2>
          </div>
          <div className="divide-y divide-border">
            {failedTx.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{tx.tenantName}</div>
                  <div className="text-xs text-muted-foreground">{tx.plan} · ${tx.amount}/mo</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{dayjs(tx.createdAt).format('MMM D')}</span>
                  <button className="px-3 py-1.5 rounded-lg border border-primary/30 text-xs text-primary hover:bg-primary/10 transition-colors">
                    Retry
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
