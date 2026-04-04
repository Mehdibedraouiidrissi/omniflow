'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Ban,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  User,
} from 'lucide-react';
import { apiGet, type AdminUser } from '@/lib/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const MOCK_USERS: AdminUser[] = Array.from({ length: 50 }, (_, i) => ({
  id: `user-${i + 1}`,
  name: ['John Smith', 'Sarah Johnson', 'Mike Chen', 'Emma Wilson', 'Alex Brown', 'Lisa Davis', 'Tom Harris', 'Amy Lee'][i % 8],
  email: `user${i + 1}@example.com`,
  tenantName: ['Acme Corp', 'TechFlow Inc', 'Startup Hub', 'Digital Agency'][i % 4],
  tenantId: `tenant-${(i % 4) + 1}`,
  role: ['Owner', 'Admin', 'Member', 'Viewer'][i % 4],
  lastLogin: new Date(Date.now() - (i * 3600000 * Math.random() * 24)).toISOString(),
  status: i % 12 === 0 ? 'suspended' : 'active',
  createdAt: new Date(Date.now() - (i * 86400000 * 5)).toISOString(),
}));

const ROLE_OPTS = ['all', 'Owner', 'Admin', 'Member', 'Viewer'];
const STATUS_OPTS = ['all', 'active', 'suspended'];
const PAGE_SIZE = 10;

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const { data: apiData, isLoading, refetch } = useQuery<{ items: AdminUser[]; total: number }>({
    queryKey: ['admin-users', search, role, status, page],
    queryFn: () =>
      apiGet<{ items: AdminUser[]; total: number }>(
        `/users?search=${search}&role=${role}&status=${status}&page=${page}&limit=${PAGE_SIZE}`,
      ),
  });

  const filtered = MOCK_USERS.filter((u) => {
    if (
      search &&
      !u.name.toLowerCase().includes(search.toLowerCase()) &&
      !u.email.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (role !== 'all' && u.role !== role) return false;
    if (status !== 'all' && u.status !== status) return false;
    return true;
  });
  const users = apiData?.items ?? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = apiData?.total ?? filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {total.toLocaleString()} users across all tenants
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
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {ROLE_OPTS.map((r) => (
                <option key={r} value={r}>{r === 'all' ? 'All Roles' : r}</option>
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
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tenant</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Last Login</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="table-row-hover transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground">{user.tenantName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-primary/10 text-primary border border-primary/20">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge badge-${user.status}`}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {dayjs(user.lastLogin).fromNow()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {dayjs(user.createdAt).format('MMM D, YYYY')}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <button
                        onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {actionMenu === user.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
                          <div className="absolute right-0 top-8 z-20 w-44 bg-popover border border-border rounded-lg shadow-xl py-1 animate-fade-in">
                            <button
                              onClick={() => setActionMenu(null)}
                              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Profile
                            </button>
                            <button
                              onClick={() => setActionMenu(null)}
                              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                            >
                              <KeyRound className="w-3.5 h-3.5" /> Reset Password
                            </button>
                            <div className="my-1 border-t border-border" />
                            <button
                              onClick={() => setActionMenu(null)}
                              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              {user.status === 'suspended' ? 'Activate' : 'Suspend'}
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
