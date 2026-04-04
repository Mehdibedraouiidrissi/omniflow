'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Settings,
  Mail,
  MessageSquare,
  HardDrive,
  CreditCard,
  AlertTriangle,
  Save,
  CheckCircle,
  XCircle,
  Edit2,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react';
import { apiGet, apiPatch, type PlatformSettings } from '@/lib/api';

const MOCK_SETTINGS: PlatformSettings = {
  general: {
    platformName: 'Omniflow',
    supportEmail: 'support@omniflow.io',
    maintenanceMode: false,
    maintenanceMessage: 'We are currently performing scheduled maintenance. Please check back soon.',
  },
  email: {
    provider: 'SMTP',
    host: 'smtp.sendgrid.net',
    port: 587,
    from: 'noreply@omniflow.io',
    status: 'connected',
  },
  sms: {
    provider: 'Twilio',
    accountSid: 'AC••••••••••••••••••••••••••••••••',
    status: 'connected',
  },
  storage: {
    provider: 'AWS S3',
    bucket: 'omniflow-uploads',
    region: 'eu-west-1',
    usedBytes: 53687091200,
    totalBytes: 107374182400,
  },
  plans: [
    { id: 'free', name: 'Free', price: 0, interval: 'monthly', features: ['Up to 500 contacts', '1 user', 'Basic templates'], limits: { contacts: 500, emails: 1000, sms: 100, storage: 104857600, users: 1 } },
    { id: 'starter', name: 'Starter', price: 29, interval: 'monthly', features: ['Up to 5K contacts', '3 users', 'Email campaigns', 'Basic automation'], limits: { contacts: 5000, emails: 20000, sms: 1000, storage: 1073741824, users: 3 } },
    { id: 'pro', name: 'Pro', price: 99, interval: 'monthly', features: ['Up to 25K contacts', '10 users', 'Advanced automation', 'AI assistant', 'Priority support'], limits: { contacts: 25000, emails: 100000, sms: 5000, storage: 10737418240, users: 10 } },
    { id: 'enterprise', name: 'Enterprise', price: 299, interval: 'monthly', features: ['Unlimited contacts', 'Unlimited users', 'Custom integrations', 'Dedicated support', 'SLA guarantee'], limits: { contacts: -1, emails: -1, sms: -1, storage: -1, users: -1 } },
  ],
};

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function StatusBadge({ status }: { status: 'connected' | 'error' }) {
  if (status === 'connected') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-green-400">
        <CheckCircle className="w-3.5 h-3.5" /> Connected
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
      <XCircle className="w-3.5 h-3.5" /> Error
    </span>
  );
}

function formatBytes(bytes: number) {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  return `${(bytes / 1048576).toFixed(0)} MB`;
}

function formatLimit(n: number) {
  if (n === -1) return 'Unlimited';
  if (n >= 1073741824) return `${(n / 1073741824).toFixed(0)} GB`;
  if (n >= 1048576) return `${(n / 1048576).toFixed(0)} MB`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

export default function SettingsPage() {
  const [savedSection, setSavedSection] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<PlatformSettings>({
    queryKey: ['admin-settings'],
    queryFn: () => apiGet<PlatformSettings>('/settings'),
    placeholderData: MOCK_SETTINGS,
  });

  const settings = data ?? MOCK_SETTINGS;

  const [platformName, setPlatformName] = useState(settings.general.platformName);
  const [supportEmail, setSupportEmail] = useState(settings.general.supportEmail);
  const [maintenanceMode, setMaintenanceMode] = useState(settings.general.maintenanceMode);
  const [maintenanceMsg, setMaintenanceMsg] = useState(settings.general.maintenanceMessage);

  const saveMutation = useMutation({
    mutationFn: (section: string) =>
      apiPatch('/settings', {
        section,
        data:
          section === 'general'
            ? { platformName, supportEmail, maintenanceMode, maintenanceMessage: maintenanceMsg }
            : {},
      }),
    onSuccess: (_, section) => {
      setSavedSection(section);
      setTimeout(() => setSavedSection(null), 3000);
    },
  });

  const storagePct = Math.round((settings.storage.usedBytes / settings.storage.totalBytes) * 100);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Settings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Configure platform-wide settings and integrations
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* General settings */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SectionHeader icon={Settings} title="General Settings" />
        <div className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Platform Name</label>
            <input
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Support Email</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Maintenance mode */}
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium text-foreground text-sm">Maintenance Mode</div>
                <div className="text-xs text-muted-foreground">Show maintenance page to all users</div>
              </div>
              <button
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  maintenanceMode ? 'bg-yellow-500' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    maintenanceMode ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`}
                />
              </button>
            </div>
            {maintenanceMode && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <textarea
                  value={maintenanceMsg}
                  onChange={(e) => setMaintenanceMsg(e.target.value)}
                  rows={2}
                  className="flex-1 bg-transparent text-yellow-200 text-xs focus:outline-none resize-none"
                  placeholder="Maintenance message shown to users..."
                />
              </div>
            )}
          </div>

          <button
            onClick={() => saveMutation.mutate('general')}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {savedSection === 'general' ? 'Saved!' : 'Save General Settings'}
          </button>
        </div>
      </div>

      {/* Email config */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SectionHeader icon={Mail} title="Email Configuration" />
        <div className="flex items-center justify-between mb-4">
          <StatusBadge status={settings.email.status} />
          <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
            <Edit2 className="w-3 h-3" /> Edit SMTP Settings
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm max-w-lg">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Provider</div>
            <div className="font-medium text-foreground">{settings.email.provider}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Host</div>
            <div className="font-medium text-foreground font-mono">{settings.email.host}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Port</div>
            <div className="font-medium text-foreground">{settings.email.port}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">From Address</div>
            <div className="font-medium text-foreground">{settings.email.from}</div>
          </div>
        </div>
      </div>

      {/* SMS config */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SectionHeader icon={MessageSquare} title="SMS Configuration" />
        <div className="flex items-center justify-between mb-4">
          <StatusBadge status={settings.sms.status} />
          <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
            <Edit2 className="w-3 h-3" /> Edit Twilio Settings
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm max-w-lg">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Provider</div>
            <div className="font-medium text-foreground">{settings.sms.provider}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Account SID</div>
            <div className="font-medium text-foreground font-mono">{settings.sms.accountSid}</div>
          </div>
        </div>
      </div>

      {/* Storage */}
      <div className="bg-card border border-border rounded-xl p-6">
        <SectionHeader icon={HardDrive} title="Storage Configuration" />
        <div className="grid grid-cols-2 gap-4 text-sm max-w-lg mb-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Provider</div>
            <div className="font-medium text-foreground">{settings.storage.provider}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Bucket</div>
            <div className="font-medium text-foreground font-mono">{settings.storage.bucket}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Region</div>
            <div className="font-medium text-foreground">{settings.storage.region}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Usage</div>
            <div className="font-medium text-foreground">
              {formatBytes(settings.storage.usedBytes)} / {formatBytes(settings.storage.totalBytes)} ({storagePct}%)
            </div>
          </div>
        </div>
        <div className="max-w-lg">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${storagePct > 80 ? 'bg-red-500' : storagePct > 60 ? 'bg-yellow-500' : 'bg-primary'}`}
              style={{ width: `${storagePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Plans management */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Billing Plans</h2>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-xs text-primary hover:bg-primary/10 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Plan
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-3 text-xs font-medium text-muted-foreground">Plan</th>
                <th className="text-right pb-3 text-xs font-medium text-muted-foreground">Price</th>
                <th className="text-right pb-3 text-xs font-medium text-muted-foreground">Contacts</th>
                <th className="text-right pb-3 text-xs font-medium text-muted-foreground">Emails</th>
                <th className="text-right pb-3 text-xs font-medium text-muted-foreground">SMS</th>
                <th className="text-right pb-3 text-xs font-medium text-muted-foreground">Storage</th>
                <th className="text-right pb-3 text-xs font-medium text-muted-foreground">Users</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {settings.plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-accent/30 transition-colors">
                  <td className="py-3">
                    <div className="font-medium text-foreground">{plan.name}</div>
                  </td>
                  <td className="py-3 text-right text-foreground">
                    {plan.price === 0 ? 'Free' : `$${plan.price}/mo`}
                  </td>
                  <td className="py-3 text-right text-muted-foreground">
                    {formatLimit(plan.limits.contacts)}
                  </td>
                  <td className="py-3 text-right text-muted-foreground">
                    {formatLimit(plan.limits.emails)}
                  </td>
                  <td className="py-3 text-right text-muted-foreground">
                    {formatLimit(plan.limits.sms)}
                  </td>
                  <td className="py-3 text-right text-muted-foreground">
                    {formatLimit(plan.limits.storage)}
                  </td>
                  <td className="py-3 text-right text-muted-foreground">
                    {formatLimit(plan.limits.users)}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {plan.price > 0 && (
                        <button className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
