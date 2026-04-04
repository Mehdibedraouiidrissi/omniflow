'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Flag,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Save,
  Search,
} from 'lucide-react';
import { apiGet, apiPatch, apiPost, apiDelete, type FeatureFlag } from '@/lib/api';
import dayjs from 'dayjs';

const MOCK_FLAGS: FeatureFlag[] = [
  { id: '1', key: 'ai_assistant', name: 'AI Assistant', description: 'Enable AI-powered assistant for contacts and campaigns', enabled: true, rules: { rolloutPercentage: 100, allowedPlans: ['pro', 'enterprise'] }, updatedAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 2592000000).toISOString() },
  { id: '2', key: 'social_inbox', name: 'Social Inbox', description: 'Unified inbox for social media messages', enabled: true, rules: { rolloutPercentage: 80, allowedPlans: ['enterprise'] }, updatedAt: new Date(Date.now() - 172800000).toISOString(), createdAt: new Date(Date.now() - 5184000000).toISOString() },
  { id: '3', key: 'advanced_analytics', name: 'Advanced Analytics', description: 'Advanced reporting dashboards and cohort analysis', enabled: false, rules: { rolloutPercentage: 0, beta: true }, updatedAt: new Date(Date.now() - 259200000).toISOString(), createdAt: new Date(Date.now() - 1296000000).toISOString() },
  { id: '4', key: 'whatsapp_integration', name: 'WhatsApp Integration', description: 'Native WhatsApp Business API integration', enabled: false, rules: { rolloutPercentage: 0, betaTenants: ['tenant-1', 'tenant-5'] }, updatedAt: new Date(Date.now() - 345600000).toISOString(), createdAt: new Date(Date.now() - 864000000).toISOString() },
  { id: '5', key: 'bulk_import_v2', name: 'Bulk Import V2', description: 'New high-performance bulk contact import system', enabled: true, rules: { rolloutPercentage: 50 }, updatedAt: new Date(Date.now() - 432000000).toISOString(), createdAt: new Date(Date.now() - 1728000000).toISOString() },
  { id: '6', key: 'email_warmup', name: 'Email Warmup', description: 'Automated email deliverability warmup sequences', enabled: true, rules: { rolloutPercentage: 100 }, updatedAt: new Date(Date.now() - 518400000).toISOString(), createdAt: new Date(Date.now() - 3456000000).toISOString() },
  { id: '7', key: 'custom_domains', name: 'Custom Domains', description: 'Custom sending domains for emails', enabled: true, rules: { allowedPlans: ['pro', 'enterprise'] }, updatedAt: new Date(Date.now() - 604800000).toISOString(), createdAt: new Date(Date.now() - 4320000000).toISOString() },
  { id: '8', key: 'maintenance_mode', name: 'Maintenance Mode', description: 'Enable platform-wide maintenance mode', enabled: false, rules: { message: 'Scheduled maintenance in progress' }, updatedAt: new Date(Date.now() - 691200000).toISOString(), createdAt: new Date(Date.now() - 6048000000).toISOString() },
];

interface FlagEditorProps {
  flag: FeatureFlag | null;
  onClose: () => void;
  onSave: (data: Partial<FeatureFlag>) => void;
  isSaving: boolean;
}

function FlagEditor({ flag, onClose, onSave, isSaving }: FlagEditorProps) {
  const [key, setKey] = useState(flag?.key ?? '');
  const [name, setName] = useState(flag?.name ?? '');
  const [description, setDescription] = useState(flag?.description ?? '');
  const [rulesJson, setRulesJson] = useState(
    flag ? JSON.stringify(flag.rules, null, 2) : '{\n  "rolloutPercentage": 100\n}',
  );
  const [jsonError, setJsonError] = useState('');

  function handleSave() {
    let rules: Record<string, unknown> = {};
    try {
      rules = JSON.parse(rulesJson);
      setJsonError('');
    } catch {
      setJsonError('Invalid JSON');
      return;
    }
    onSave({ key, name, description, rules });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">
            {flag ? 'Edit Feature Flag' : 'Create Feature Flag'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Key</label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
              placeholder="feature_key"
              className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Display Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Feature Name"
              className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What does this feature flag control?"
              className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Rules (JSON)</label>
            <textarea
              value={rulesJson}
              onChange={(e) => setRulesJson(e.target.value)}
              rows={6}
              className={`w-full px-3 py-2 rounded-lg bg-input border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none ${
                jsonError ? 'border-red-500' : 'border-border'
              }`}
            />
            {jsonError && <p className="text-xs text-red-400">{jsonError}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !key || !name}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Flag'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FeatureFlagsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editFlag, setEditFlag] = useState<FeatureFlag | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const { data, isLoading, refetch } = useQuery<FeatureFlag[]>({
    queryKey: ['admin-feature-flags'],
    queryFn: () => apiGet<FeatureFlag[]>('/feature-flags'),
    placeholderData: MOCK_FLAGS,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiPatch(`/feature-flags/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] }),
  });

  const saveMutation = useMutation({
    mutationFn: (flagData: Partial<FeatureFlag>) => {
      if (editFlag && editFlag.id) {
        return apiPatch(`/feature-flags/${editFlag.id}`, flagData);
      }
      return apiPost('/feature-flags', flagData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
      setShowEditor(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/feature-flags/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] }),
  });

  const flags = data ?? MOCK_FLAGS;
  const filtered = flags.filter(
    (f) =>
      !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.key.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {showEditor && (
        <FlagEditor
          flag={editFlag}
          onClose={() => setShowEditor(false)}
          onSave={(data) => saveMutation.mutate(data)}
          isSaving={saveMutation.isPending}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Feature Flags</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Control feature availability across the platform
          </p>
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
            onClick={() => { setEditFlag(null); setShowEditor(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Flag
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search flags..."
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Flags table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Flag</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Key</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Description</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Last Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((flag) => (
                <tr key={flag.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-foreground">{flag.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {flag.key}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{flag.description}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleMutation.mutate({ id: flag.id, enabled: !flag.enabled })}
                      disabled={toggleMutation.isPending}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        flag.enabled ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          flag.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {dayjs(flag.updatedAt).format('MMM D, YYYY')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditFlag(flag); setShowEditor(true); }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete flag "${flag.name}"?`)) {
                            deleteMutation.mutate(flag.id);
                          }
                        }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
