'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Building2,
  MoreHorizontal,
  Eye,
  Ban,
  Trash2,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Users,
  RefreshCw,
} from 'lucide-react';
import { apiGet, type Tenant } from '@/lib/api';
import dayjs from 'dayjs';

const MOCK_TENANTS: Tenant[] = Array.from({ length: 40 }, (_, i) => ({
  id: `tenant-${i + 1}`,
  name: ['Acme Corp', 'TechFlow Inc', 'Startup Hub', 'Digital Agency', 'Cloud Ventures', 'DataSphere', 'GreenTech', 'Nexify Ltd'][i % 8] + (i > 7 ? ` ${Math.floor(i / 8) + 1}` : ''),
  slug: `tenant-${i + 1}`,
  type: (['business', 'agency', 'enterprise'] as const)[i % 3],
  plan: (['free', 'starter', 'pro', 'enterprise'] as const)[i % 4],
  status: i % 10 === 0 ? 'suspended' : i % 15 === 0 ? 'inactive' : i % 20 === 0 ? 'trial' : 'active',
  userCount: Math.floor(Math.random() * 50) + 1,
  contactCount: Math.floor(Math.random() * 5000) + 100,
  email: `admin@tenant${i + 1}.com`,
  createdAt: new Date(Date.now() - (i * 86400000 * 7)).toISOString(),
  limits: { contacts: 10000, emails: 50000, sms: 5000, storage: 5368709120 },
  usage: { contacts: Math.floor(Math.random() * 8000), emails: Math.floor(Math.random() * 40000), sms: Math.floor(Math.random() * 4000), storage: Math.floor(Math.random() * 4000000000) },
}));

const PLAN_OPTS = ['all', 'free', 'starter', 'pro', 'enterprise'];
const STATUS_OPTS = ['all', 'active', 'trial', 'suspended', 'inactive'];
const TYPE_OPTS = ['all', 'business', 'agency', 'enterprise'];
const PAGE_SIZE = 10;

export default function TenantsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [page, setPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const { data: apiData, isLoading, refetch } = useQuery<{ items: Tenant[]; total: number }>({
    queryKey: ['admin-tenants', search, plan, status, type, page],
    queryFn: () =>
      apiGet<{ items: Tenant[]; total: number }>(
        `/tenants?search=${search}&plan=${plan}&status=${status}&type=${type}&page=${page}&limit=${PAGE_SIZE}`,
      ),
  });

  // Use mock if API fails/loading
  const filtered = MOCK_TENANTS.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (plan !== 'all' && t.plan !== plan) return false;
    if (status !== 'all' && t.status !== status) return false;
    if (type !== 'all' && t.type !== type) return false;
    return true;
  });
  const tenants = apiData?.items ?? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = apiData?.total ?? filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function StatusBadge({ status }: { status: string }) {
    return <span className={`badge badge-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  }

  function PlanBadge({ plan }: { plan: string }) {
    const labels: Record<string, string> = { free: 'Free', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
    return <span className={`badge badge-${plan}`}>{labels[plan] || plan}</span>;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenant Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {total.toLocaleString()} tenants on the platform
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

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] flex items-center gap-2 px-3 py-2 rounded-lg bg-input border border-border text-sm">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={plan}
              onChange={(e) => { setPlan(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {PLAN_OPTS.map((p) => (
                <option key={p} value={p}>{p === 'all' ? 'All Plans' : p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {STATUS_OPTS.map((s) => (
                <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <select
              value={type}
              onChange={(e) => { setType(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {TYPE_OPTS.map((t) => (
                <option key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Users</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Contacts</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="table-row-hover transition-colors"
                  onClick={() => router.push(`/tenants/${tenant.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{tenant.name}</div>
                        <div className="text-xs text-muted-foreground">{tenant.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{tenant.type}</td>
                  <td className="px-4 py-3"><PlanBadge plan={tenant.plan} /></td>
                  <td className="px-4 py-3"><StatusBadge status={tenant.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-1 text-muted-foreground">
                      <Users className="w-3 h-3" /> {tenant.userCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {tenant.contactCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {dayjs(tenant.createdAt).format('MMM D, YYYY')}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <button
                        onClick={() => setActionMenu(actionMenu === tenant.id ? null : tenant.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {actionMenu === tenant.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActionMenu(null)}
                          />
                          <div className="absolute right-0 top-8 z-20 w-48 bg-popover border border-border rounded-lg shadow-xl py-1 animate-fade-in">
                            <button
                              onClick={() => { router.push(`/tenants/${tenant.id}`); setActionMenu(null); }}
                              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Details
                            </button>
                            <button
                              onClick={() => setActionMenu(null)}
                              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                            >
                              <LogIn className="w-3.5 h-3.5" /> Impersonate
                            </button>
                            <div className="my-1 border-t border-border" />
                            <button
                              onClick={() => setActionMenu(null)}
                              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              {tenant.status === 'suspended' ? 'Activate' : 'Suspend'}
                            </button>
                            <button
                              onClick={() => setActionMenu(null)}
                              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pg = i + 1;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    page === pg
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
