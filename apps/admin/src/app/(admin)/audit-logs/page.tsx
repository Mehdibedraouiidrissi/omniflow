'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ScrollText,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Calendar,
} from 'lucide-react';
import { apiGet, type AuditLog } from '@/lib/api';
import dayjs from 'dayjs';

const ACTIONS = [
  'all',
  'contact.created', 'contact.updated', 'contact.deleted',
  'campaign.created', 'campaign.sent',
  'user.invited', 'user.removed',
  'workflow.created', 'workflow.executed',
  'tenant.updated', 'tenant.suspended',
  'billing.subscription_changed',
  'admin.impersonated',
];

const MOCK_LOGS: AuditLog[] = Array.from({ length: 50 }, (_, i) => ({
  id: `log-${i + 1}`,
  timestamp: new Date(Date.now() - (i * 1800000)).toISOString(),
  userId: `user-${(i % 5) + 1}`,
  userName: ['John Smith', 'Sarah Johnson', 'Mike Chen', 'Emma Wilson', 'Alex Brown'][i % 5],
  tenantId: `tenant-${(i % 4) + 1}`,
  tenantName: ['Acme Corp', 'TechFlow Inc', 'Startup Hub', 'Digital Agency'][i % 4],
  action: ACTIONS.slice(1)[i % (ACTIONS.length - 1)],
  entity: ['Contact', 'Campaign', 'User', 'Workflow', 'Tenant', 'Billing'][i % 6],
  entityId: `entity-${i + 100}`,
  ipAddress: `192.168.${Math.floor(i / 10)}.${i % 256}`,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  metadata: { detail: `Action performed on entity ${i + 100}`, timestamp: new Date().toISOString() },
}));

const PAGE_SIZE = 15;

function ActionBadge({ action }: { action: string }) {
  const [entity, verb] = action.split('.');
  const colors: Record<string, string> = {
    contact: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    campaign: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    user: 'bg-green-500/10 text-green-400 border-green-500/20',
    workflow: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    tenant: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    billing: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    admin: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  const color = colors[entity] || 'bg-muted text-muted-foreground border-border';

  return (
    <span className={`badge border ${color} font-mono`}>
      {entity}.{verb}
    </span>
  );
}

function LogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="table-row-hover transition-colors" onClick={() => setExpanded(!expanded)}>
        <td className="px-4 py-3">
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {dayjs(log.timestamp).format('MMM D, HH:mm:ss')}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm font-medium text-foreground">{log.userName}</div>
          <div className="text-xs text-muted-foreground font-mono">{log.userId}</div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-foreground">{log.tenantName}</div>
        </td>
        <td className="px-4 py-3">
          <ActionBadge action={log.action} />
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-foreground">{log.entity}</div>
          <div className="text-xs text-muted-foreground font-mono">{log.entityId}</div>
        </td>
        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{log.ipAddress}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="px-4 pb-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-medium text-foreground mb-1">User Agent</div>
                  <div className="text-muted-foreground font-mono">{log.userAgent}</div>
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">Timestamp (UTC)</div>
                  <div className="text-muted-foreground font-mono">
                    {dayjs(log.timestamp).format('YYYY-MM-DD HH:mm:ss [UTC]')}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-foreground mb-1">Metadata</div>
                <pre className="text-xs text-muted-foreground overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const { data: apiData, isLoading, refetch } = useQuery<{ items: AuditLog[]; total: number }>({
    queryKey: ['admin-audit-logs', search, action, dateFrom, dateTo, page],
    queryFn: () =>
      apiGet<{ items: AuditLog[]; total: number }>(
        `/audit-logs?search=${search}&action=${action}&from=${dateFrom}&to=${dateTo}&page=${page}&limit=${PAGE_SIZE}`,
      ),
  });

  const filtered = MOCK_LOGS.filter((l) => {
    if (search && !l.userName.toLowerCase().includes(search.toLowerCase()) && !l.tenantName.toLowerCase().includes(search.toLowerCase())) return false;
    if (action !== 'all' && l.action !== action) return false;
    return true;
  });
  const logs = apiData?.items ?? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = apiData?.total ?? filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Complete audit trail of all platform activity
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
              placeholder="Search by user or tenant..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <select
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{a === 'all' ? 'All Actions' : a}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="px-2 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span>To</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="px-2 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 w-8" />
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tenant</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Entity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ScrollText className="w-3.5 h-3.5" />
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} entries
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
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
