'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Users,
  Mail,
  MessageSquare,
  HardDrive,
  LogIn,
  Ban,
  Trash2,
  CreditCard,
  RefreshCw,
  ChevronRight,
  Activity,
  Calendar,
} from 'lucide-react';
import { apiGet, apiPatch, type Tenant, type TenantMember, type AuditLog } from '@/lib/api';
import dayjs from 'dayjs';

const MOCK_TENANT: Tenant = {
  id: 'tenant-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  type: 'business',
  plan: 'pro',
  status: 'active',
  userCount: 12,
  contactCount: 4823,
  email: 'admin@acme.com',
  createdAt: new Date(Date.now() - 15552000000).toISOString(),
  limits: { contacts: 10000, emails: 50000, sms: 5000, storage: 5368709120 },
  usage: { contacts: 4823, emails: 31250, sms: 1840, storage: 2147483648 },
};

const MOCK_MEMBERS: TenantMember[] = [
  { id: '1', name: 'John Smith', email: 'john@acme.com', role: 'Owner', lastLogin: new Date(Date.now() - 3600000).toISOString(), status: 'active' },
  { id: '2', name: 'Sarah Johnson', email: 'sarah@acme.com', role: 'Admin', lastLogin: new Date(Date.now() - 86400000).toISOString(), status: 'active' },
  { id: '3', name: 'Mike Chen', email: 'mike@acme.com', role: 'Member', lastLogin: new Date(Date.now() - 172800000).toISOString(), status: 'active' },
  { id: '4', name: 'Emma Wilson', email: 'emma@acme.com', role: 'Member', lastLogin: new Date(Date.now() - 604800000).toISOString(), status: 'inactive' },
];

const MOCK_LOGS: AuditLog[] = [
  { id: '1', timestamp: new Date(Date.now() - 1800000).toISOString(), userId: '1', userName: 'John Smith', tenantId: 'tenant-1', tenantName: 'Acme Corp', action: 'contact.created', entity: 'Contact', entityId: 'c-123', ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0', metadata: { name: 'New Contact' } },
  { id: '2', timestamp: new Date(Date.now() - 7200000).toISOString(), userId: '2', userName: 'Sarah Johnson', tenantId: 'tenant-1', tenantName: 'Acme Corp', action: 'campaign.sent', entity: 'Campaign', entityId: 'camp-456', ipAddress: '192.168.1.2', userAgent: 'Mozilla/5.0', metadata: { recipients: 1250 } },
  { id: '3', timestamp: new Date(Date.now() - 86400000).toISOString(), userId: '1', userName: 'John Smith', tenantId: 'tenant-1', tenantName: 'Acme Corp', action: 'user.invited', entity: 'User', entityId: 'u-789', ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0', metadata: { email: 'new@acme.com' } },
];

function UsageMeter({
  label,
  icon: Icon,
  used,
  limit,
  unit = '',
}: {
  label: string;
  icon: React.ElementType;
  used: number;
  limit: number;
  unit?: string;
}) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const color = pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-yellow-500' : 'bg-primary';
  const textColor = pct > 90 ? 'text-red-400' : pct > 75 ? 'text-yellow-400' : 'text-primary';

  const fmt = (n: number) => {
    if (unit === 'bytes') {
      if (n >= 1073741824) return `${(n / 1073741824).toFixed(1)} GB`;
      if (n >= 1048576) return `${(n / 1048576).toFixed(0)} MB`;
      return `${(n / 1024).toFixed(0)} KB`;
    }
    return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-medium ${textColor}`}>{fmt(used)}</span>
          <span className="text-muted-foreground">/ {fmt(limit)}</span>
          <span className={`text-xs font-medium ${textColor}`}>{pct}%</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: tenant, isLoading, refetch } = useQuery<Tenant>({
    queryKey: ['admin-tenant', id],
    queryFn: () => apiGet<Tenant>(`/tenants/${id}`),
    placeholderData: MOCK_TENANT,
  });

  const { data: members } = useQuery<TenantMember[]>({
    queryKey: ['admin-tenant-members', id],
    queryFn: () => apiGet<TenantMember[]>(`/tenants/${id}/members`),
    placeholderData: MOCK_MEMBERS,
  });

  const { data: logs } = useQuery<AuditLog[]>({
    queryKey: ['admin-tenant-logs', id],
    queryFn: () => apiGet<AuditLog[]>(`/tenants/${id}/audit-logs?limit=10`),
    placeholderData: MOCK_LOGS,
  });

  const suspendMutation = useMutation({
    mutationFn: () =>
      apiPatch(`/tenants/${id}/status`, {
        status: t.status === 'suspended' ? 'active' : 'suspended',
      }),
    onSuccess: () => refetch(),
  });

  const t = tenant ?? MOCK_TENANT;
  const membersList = members ?? MOCK_MEMBERS;
  const logsList = logs ?? MOCK_LOGS;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/tenants')}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Tenants</span>
            <ChevronRight className="w-3 h-3" />
            <span>{t.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-accent transition-colors"
          >
            <LogIn className="w-4 h-4" /> Impersonate
          </button>
          <button
            onClick={() => suspendMutation.mutate()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-yellow-500/30 text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors"
          >
            <Ban className="w-4 h-4" />
            {t.status === 'suspended' ? 'Activate' : 'Suspend'}
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-destructive/30 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tenant info */}
        <div className="md:col-span-1 bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-foreground">{t.name}</div>
              <div className="text-xs text-muted-foreground">/{t.slug}</div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{t.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="text-foreground capitalize">{t.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className={`badge badge-${t.plan}`}>{t.plan.charAt(0).toUpperCase() + t.plan.slice(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={`badge badge-${t.status}`}>{t.status.charAt(0).toUpperCase() + t.status.slice(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="text-foreground">{dayjs(t.createdAt).format('MMM D, YYYY')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Users</span>
              <span className="text-foreground">{t.userCount}</span>
            </div>
          </div>
          <div className="pt-3 border-t border-border">
            <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-primary/30 text-sm text-primary hover:bg-primary/10 transition-colors">
              <CreditCard className="w-4 h-4" /> Change Plan
            </button>
          </div>
        </div>

        {/* Usage */}
        <div className="md:col-span-2 bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Usage & Limits</h2>
          <div className="space-y-5">
            <UsageMeter
              label="Contacts"
              icon={Users}
              used={t.usage.contacts}
              limit={t.limits.contacts}
            />
            <UsageMeter
              label="Emails Sent"
              icon={Mail}
              used={t.usage.emails}
              limit={t.limits.emails}
            />
            <UsageMeter
              label="SMS Sent"
              icon={MessageSquare}
              used={t.usage.sms}
              limit={t.limits.sms}
            />
            <UsageMeter
              label="Storage"
              icon={HardDrive}
              used={t.usage.storage}
              limit={t.limits.storage}
              unit="bytes"
            />
          </div>
        </div>
      </div>

      {/* Members & Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Members */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Team Members</h2>
            <span className="text-xs text-muted-foreground">{membersList.length} members</span>
          </div>
          <div className="space-y-2">
            {membersList.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {member.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{member.name}</div>
                  <div className="text-xs text-muted-foreground">{member.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-muted-foreground">{member.role}</div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span
                      className={`status-dot ${member.status === 'active' ? 'status-dot-active' : 'status-dot-inactive'}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {dayjs(member.lastLogin).fromNow()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Recent Activity</h2>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {logsList.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground">
                    <span className="font-medium">{log.userName}</span>{' '}
                    <span className="text-muted-foreground">{log.action.replace('.', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {dayjs(log.timestamp).format('MMM D, HH:mm')}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-mono text-muted-foreground">{log.ipAddress}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
