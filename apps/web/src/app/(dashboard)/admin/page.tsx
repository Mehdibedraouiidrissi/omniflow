'use client';

import { useState } from 'react';
import {
  Shield, Users, Building2, Activity, Search,
  MoreHorizontal, CheckCircle, XCircle, AlertTriangle,
  Server, Database, Cpu, HardDrive, ToggleLeft,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { StatCard } from '@/components/ui/stat-card';
import { SearchInput } from '@/components/ui/search-input';
import { UserAvatar } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';

interface TenantRow {
  id: string;
  name: string;
  type: string;
  status: string;
  contactsCount: number;
  usersCount: number;
  plan: string;
  createdAt: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  status: string;
  tenantsCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

const fallbackTenants: TenantRow[] = [
  { id: '1', name: 'Acme Corp', type: 'BUSINESS', status: 'ACTIVE', contactsCount: 1247, usersCount: 5, plan: 'Professional', createdAt: '2024-01-15' },
  { id: '2', name: 'Digital Agency Pro', type: 'AGENCY', status: 'ACTIVE', contactsCount: 3421, usersCount: 12, plan: 'Agency', createdAt: '2024-02-20' },
  { id: '3', name: 'StartupIO', type: 'BUSINESS', status: 'TRIAL', contactsCount: 89, usersCount: 2, plan: 'Starter', createdAt: '2024-07-01' },
  { id: '4', name: 'MegaCorp', type: 'BUSINESS', status: 'ACTIVE', contactsCount: 5678, usersCount: 8, plan: 'Enterprise', createdAt: '2023-11-10' },
  { id: '5', name: 'Suspended LLC', type: 'BUSINESS', status: 'SUSPENDED', contactsCount: 342, usersCount: 1, plan: 'Starter', createdAt: '2024-04-05' },
];

const fallbackUsers: UserRow[] = [
  { id: '1', name: 'John Doe', email: 'john@acme.com', status: 'ACTIVE', tenantsCount: 2, lastLoginAt: new Date(Date.now() - 3600000).toISOString(), createdAt: '2024-01-15' },
  { id: '2', name: 'Jane Smith', email: 'jane@agency.pro', status: 'ACTIVE', tenantsCount: 3, lastLoginAt: new Date(Date.now() - 7200000).toISOString(), createdAt: '2024-02-20' },
  { id: '3', name: 'Mike Chen', email: 'mike@startup.io', status: 'ACTIVE', tenantsCount: 1, lastLoginAt: new Date(Date.now() - 86400000).toISOString(), createdAt: '2024-07-01' },
  { id: '4', name: 'Lisa Park', email: 'lisa@megacorp.com', status: 'SUSPENDED', tenantsCount: 1, lastLoginAt: null, createdAt: '2024-03-15' },
];

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const fallbackFlags: FeatureFlag[] = [
  { id: '1', name: 'ai_assistant', description: 'Enable AI-powered writing assistant', enabled: true },
  { id: '2', name: 'advanced_analytics', description: 'Show advanced analytics dashboard', enabled: true },
  { id: '3', name: 'social_planner_v2', description: 'New social planner interface', enabled: false },
  { id: '4', name: 'workflow_branching', description: 'Advanced workflow branching logic', enabled: false },
  { id: '5', name: 'white_label_emails', description: 'White label email branding', enabled: true },
];

export default function AdminPage() {
  const [tenantSearch, setTenantSearch] = useState('');
  const [flags, setFlags] = useState(fallbackFlags);

  const tenantColumns: Column<TenantRow>[] = [
    {
      key: 'name',
      header: 'Tenant',
      sortable: true,
      render: (t) => (
        <div>
          <p className="font-medium">{t.name}</p>
          <Badge variant="outline" className="text-xs">{t.type}</Badge>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <Badge
          variant={t.status === 'ACTIVE' ? 'success' : t.status === 'TRIAL' ? 'warning' : 'destructive'}
          className="text-xs"
        >
          {t.status.toLowerCase()}
        </Badge>
      ),
    },
    { key: 'plan', header: 'Plan' },
    {
      key: 'contactsCount',
      header: 'Contacts',
      sortable: true,
      render: (t) => t.contactsCount.toLocaleString(),
    },
    {
      key: 'usersCount',
      header: 'Users',
      render: (t) => t.usersCount.toString(),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (t) => formatDate(t.createdAt),
    },
  ];

  const userColumns: Column<UserRow>[] = [
    {
      key: 'name',
      header: 'User',
      render: (u) => (
        <div className="flex items-center gap-2">
          <UserAvatar name={u.name} className="h-7 w-7" />
          <div>
            <p className="text-sm font-medium">{u.name}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <Badge variant={u.status === 'ACTIVE' ? 'success' : 'destructive'} className="text-xs">
          {u.status.toLowerCase()}
        </Badge>
      ),
    },
    { key: 'tenantsCount', header: 'Accounts', render: (u) => u.tenantsCount.toString() },
    {
      key: 'lastLoginAt',
      header: 'Last Login',
      render: (u) => u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never',
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (u) => formatDate(u.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Console"
        description="Platform-wide administration"
      />

      {/* Platform Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Tenants" value="156" change={8.3} icon={Building2} />
        <StatCard label="Total Users" value="1,247" change={12.1} icon={Users} />
        <StatCard label="Active Sessions" value="89" change={3.5} icon={Activity} />
        <StatCard label="MRR" value="$46,342" change={18.7} icon={Shield} />
      </div>

      <Tabs defaultValue="tenants">
        <TabsList>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
        </TabsList>

        {/* Tenants */}
        <TabsContent value="tenants" className="space-y-4">
          <SearchInput
            onSearch={setTenantSearch}
            placeholder="Search tenants..."
            className="max-w-sm"
          />
          <DataTable
            columns={tenantColumns}
            data={fallbackTenants.filter((t) =>
              t.name.toLowerCase().includes(tenantSearch.toLowerCase()),
            )}
            page={1}
            totalPages={1}
            onPageChange={() => {}}
          />
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <DataTable
            columns={userColumns}
            data={fallbackUsers}
            page={1}
            totalPages={1}
            onPageChange={() => {}}
          />
        </TabsContent>

        {/* System Health */}
        <TabsContent value="system">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'API Server', icon: Server, status: 'healthy', uptime: '99.97%' },
              { label: 'Database', icon: Database, status: 'healthy', uptime: '99.99%' },
              { label: 'Worker Queue', icon: Cpu, status: 'healthy', uptime: '99.95%' },
              { label: 'Storage', icon: HardDrive, status: 'warning', uptime: '78% used' },
            ].map((service) => (
              <Card key={service.label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-muted p-2">
                    <service.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{service.label}</p>
                    <p className="text-xs text-muted-foreground">{service.uptime}</p>
                  </div>
                  {service.status === 'healthy' ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Feature Flags */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Toggle features across the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {flags.map((flag) => (
                <div key={flag.id} className="flex items-center justify-between rounded-md border p-4">
                  <div className="flex items-center gap-3">
                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium font-mono">{flag.name}</p>
                      <p className="text-xs text-muted-foreground">{flag.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={(checked) =>
                      setFlags(flags.map((f) => f.id === flag.id ? { ...f, enabled: checked } : f))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
