'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Hourglass,
} from 'lucide-react';
import { apiGet, apiPost, type QueueStats, type FailedJob } from '@/lib/api';
import dayjs from 'dayjs';

const MOCK_QUEUES: QueueStats[] = [
  { name: 'email', displayName: 'Email Queue', active: 3, waiting: 12, completed: 45823, failed: 18, delayed: 2 },
  { name: 'sms', displayName: 'SMS Queue', active: 1, waiting: 5, completed: 12430, failed: 3, delayed: 0 },
  { name: 'workflow', displayName: 'Workflow Engine', active: 8, waiting: 24, completed: 89234, failed: 12, delayed: 6 },
  { name: 'webhook-delivery', displayName: 'Webhook Delivery', active: 2, waiting: 8, completed: 23456, failed: 45, delayed: 1 },
  { name: 'social', displayName: 'Social Posting', active: 0, waiting: 3, completed: 5621, failed: 2, delayed: 4 },
  { name: 'reminders', displayName: 'Reminders', active: 1, waiting: 15, completed: 34120, failed: 1, delayed: 120 },
  { name: 'reports', displayName: 'Report Generation', active: 2, waiting: 4, completed: 2341, failed: 0, delayed: 0 },
  { name: 'imports', displayName: 'Data Imports', active: 1, waiting: 2, completed: 1234, failed: 5, delayed: 0 },
  { name: 'billing', displayName: 'Billing Jobs', active: 0, waiting: 0, completed: 8923, failed: 2, delayed: 0 },
];

const MOCK_FAILED: FailedJob[] = [
  { id: 'job-1', queue: 'email', name: 'sendCampaignEmail', failedAt: new Date(Date.now() - 1800000).toISOString(), reason: 'SMTP connection timeout after 30s', attempts: 3, data: { campaignId: 'c-123', recipientId: 'r-456' } },
  { id: 'job-2', queue: 'webhook-delivery', name: 'deliverWebhook', failedAt: new Date(Date.now() - 3600000).toISOString(), reason: 'HTTP 503 Service Unavailable from endpoint', attempts: 5, data: { webhookId: 'wh-789', url: 'https://api.example.com/hook' } },
  { id: 'job-3', queue: 'workflow', name: 'executeWorkflowStep', failedAt: new Date(Date.now() - 7200000).toISOString(), reason: 'Contact not found: id=contact-999', attempts: 1, data: { workflowId: 'wf-321', stepId: 'step-2' } },
  { id: 'job-4', queue: 'imports', name: 'processContactImport', failedAt: new Date(Date.now() - 10800000).toISOString(), reason: 'CSV parse error: invalid encoding on row 1523', attempts: 2, data: { importId: 'imp-101', rows: 5000 } },
  { id: 'job-5', queue: 'billing', name: 'processSubscriptionRenewal', failedAt: new Date(Date.now() - 86400000).toISOString(), reason: 'Stripe error: card_declined', attempts: 3, data: { tenantId: 'tenant-42', planId: 'pro' } },
];

function QueueCard({ queue }: { queue: QueueStats }) {
  const hasIssues = queue.failed > 0;
  const isHealthy = queue.active > 0 || queue.waiting > 0;

  return (
    <div className={`bg-card border rounded-xl p-4 transition-all duration-200 hover:border-primary/30 ${hasIssues ? 'border-red-500/30' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground text-sm">{queue.displayName}</span>
        </div>
        <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
          hasIssues ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
          isHealthy ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
          'bg-muted text-muted-foreground border border-border'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${hasIssues ? 'bg-red-400' : isHealthy ? 'bg-green-400' : 'bg-muted-foreground'}`} />
          {hasIssues ? 'Issues' : isHealthy ? 'Running' : 'Idle'}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-muted/50 rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Activity className="w-3 h-3 text-blue-400" />
          </div>
          <div className="text-sm font-bold text-blue-400">{queue.active}</div>
          <div className="text-xs text-muted-foreground">Active</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-yellow-400" />
          </div>
          <div className="text-sm font-bold text-yellow-400">{queue.waiting}</div>
          <div className="text-xs text-muted-foreground">Waiting</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
          </div>
          <div className="text-sm font-bold text-green-400">
            {queue.completed >= 1000 ? `${(queue.completed / 1000).toFixed(0)}K` : queue.completed}
          </div>
          <div className="text-xs text-muted-foreground">Done</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <XCircle className="w-3 h-3 text-red-400" />
          </div>
          <div className={`text-sm font-bold ${queue.failed > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
            {queue.failed}
          </div>
          <div className="text-xs text-muted-foreground">Failed</div>
        </div>
      </div>

      {queue.delayed > 0 && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-yellow-400">
          <Hourglass className="w-3 h-3" />
          {queue.delayed} delayed job{queue.delayed > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

function FailedJobRow({ job }: { job: FailedJob }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const retryMutation = useMutation({
    mutationFn: () => apiPost(`/queues/${job.queue}/jobs/${job.id}/retry`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-failed-jobs'] }),
  });

  return (
    <>
      <tr className="table-row-hover transition-colors">
        <td className="px-4 py-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </td>
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {job.queue}
          </span>
        </td>
        <td className="px-4 py-3 font-medium text-foreground text-sm">{job.name}</td>
        <td className="px-4 py-3 text-sm text-red-400 max-w-xs truncate">{job.reason}</td>
        <td className="px-4 py-3 text-center text-sm text-muted-foreground">{job.attempts}</td>
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
          {dayjs(job.failedAt).format('MMM D, HH:mm')}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={() => retryMutation.mutate()}
            disabled={retryMutation.isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary/30 text-xs text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
          >
            <RotateCcw className={`w-3 h-3 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
            Retry
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="px-4 pb-3">
            <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs text-muted-foreground overflow-x-auto">
              <div className="text-xs font-medium text-foreground mb-2">Job Data:</div>
              <pre>{JSON.stringify(job.data, null, 2)}</pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function JobsPage() {
  const { data: queues, isLoading, refetch } = useQuery<QueueStats[]>({
    queryKey: ['admin-queues'],
    queryFn: () => apiGet<QueueStats[]>('/queues'),
    placeholderData: MOCK_QUEUES,
    refetchInterval: 15000,
  });

  const { data: failedJobs } = useQuery<FailedJob[]>({
    queryKey: ['admin-failed-jobs'],
    queryFn: () => apiGet<FailedJob[]>('/queues/failed-jobs'),
    placeholderData: MOCK_FAILED,
  });

  const queueList = queues ?? MOCK_QUEUES;
  const failedList = failedJobs ?? MOCK_FAILED;

  const totalActive = queueList.reduce((sum, q) => sum + q.active, 0);
  const totalWaiting = queueList.reduce((sum, q) => sum + q.waiting, 0);
  const totalFailed = queueList.reduce((sum, q) => sum + q.failed, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jobs & Queues</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Monitor background job processing across all queues
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

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{totalActive}</div>
          <div className="text-sm text-muted-foreground mt-1">Active Jobs</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{totalWaiting}</div>
          <div className="text-sm text-muted-foreground mt-1">Waiting</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className={`text-2xl font-bold ${totalFailed > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
            {totalFailed}
          </div>
          <div className="text-sm text-muted-foreground mt-1">Failed</div>
        </div>
      </div>

      {/* Queue cards */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Queue Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {queueList.map((queue) => (
            <QueueCard key={queue.name} queue={queue} />
          ))}
        </div>
      </div>

      {/* Failed jobs table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <h2 className="font-semibold text-foreground">Failed Jobs</h2>
          <span className="badge badge-suspended ml-1">{failedList.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 w-8" />
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Queue</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Job Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Error</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Attempts</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Failed At</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {failedList.map((job) => (
                <FailedJobRow key={job.id} job={job} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
