'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Play, Pause, Zap, Clock, Users, MoreHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApiQuery } from '@/hooks/use-api';
import { formatDate, formatRelativeTime } from '@/lib/utils';

interface Workflow {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  status: string;
  lastRunAt: string | null;
  totalRuns: number;
  successRate: number;
  enrolledCount: number;
  createdAt: string;
}

const fallbackWorkflows: Workflow[] = [
  { id: '1', name: 'New Lead Follow-up', description: 'Automatically sends a welcome email and SMS to new leads', triggerType: 'CONTACT_CREATED', status: 'ACTIVE', lastRunAt: new Date(Date.now() - 3600000).toISOString(), totalRuns: 1247, successRate: 98.5, enrolledCount: 42, createdAt: new Date(Date.now() - 86400000 * 60).toISOString() },
  { id: '2', name: 'Appointment Reminder', description: 'Sends reminder emails 24h and 1h before appointments', triggerType: 'APPOINTMENT_BOOKED', status: 'ACTIVE', lastRunAt: new Date(Date.now() - 7200000).toISOString(), totalRuns: 856, successRate: 99.2, enrolledCount: 18, createdAt: new Date(Date.now() - 86400000 * 45).toISOString() },
  { id: '3', name: 'Re-engagement Campaign', description: 'Targets inactive contacts with a 3-email sequence', triggerType: 'TAG_ADDED', status: 'PAUSED', lastRunAt: new Date(Date.now() - 86400000 * 7).toISOString(), totalRuns: 324, successRate: 85.3, enrolledCount: 0, createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: '4', name: 'Post-Purchase Onboarding', description: 'Guides new customers through product setup', triggerType: 'PAYMENT_SUCCEEDED', status: 'ACTIVE', lastRunAt: new Date(Date.now() - 14400000).toISOString(), totalRuns: 512, successRate: 97.8, enrolledCount: 12, createdAt: new Date(Date.now() - 86400000 * 90).toISOString() },
  { id: '5', name: 'Birthday Campaign', description: 'Sends birthday wishes with special offers', triggerType: 'MANUAL', status: 'DRAFT', lastRunAt: null, totalRuns: 0, successRate: 0, enrolledCount: 0, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: '6', name: 'Review Request', description: 'Asks customers for reviews after service completion', triggerType: 'STAGE_CHANGED', status: 'ACTIVE', lastRunAt: new Date(Date.now() - 18000000).toISOString(), totalRuns: 687, successRate: 94.1, enrolledCount: 8, createdAt: new Date(Date.now() - 86400000 * 120).toISOString() },
];

const statusColors: Record<string, 'success' | 'warning' | 'secondary'> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  DRAFT: 'secondary',
};

const triggerLabels: Record<string, string> = {
  CONTACT_CREATED: 'Contact Created',
  APPOINTMENT_BOOKED: 'Appointment Booked',
  TAG_ADDED: 'Tag Added',
  PAYMENT_SUCCEEDED: 'Payment Succeeded',
  STAGE_CHANGED: 'Stage Changed',
  FORM_SUBMITTED: 'Form Submitted',
  MESSAGE_RECEIVED: 'Message Received',
  WEBHOOK: 'Webhook',
  MANUAL: 'Manual',
};

export default function WorkflowsPage() {
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: workflows } = useApiQuery<Workflow[]>(
    ['workflows'],
    '/workflows',
    { placeholderData: fallbackWorkflows },
  );

  const allWorkflows = workflows || fallbackWorkflows;
  const filtered = statusFilter === 'all'
    ? allWorkflows
    : allWorkflows.filter((w) => w.status === statusFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        description="Automate your business processes"
        actions={
          <Link href="/workflows/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Workflow
            </Button>
          </Link>
        }
      />

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((wf) => (
          <Card key={wf.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <Link href={`/workflows/${wf.id}`} className="text-sm font-semibold hover:text-primary">
                    {wf.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{wf.description}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem>View History</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <Badge variant={statusColors[wf.status] || 'secondary'} className="text-xs">
                  {wf.status.toLowerCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Zap className="mr-1 h-3 w-3" />
                  {triggerLabels[wf.triggerType] || wf.triggerType}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-semibold">{wf.totalRuns.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Runs</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{wf.successRate ? `${wf.successRate}%` : '-'}</p>
                  <p className="text-xs text-muted-foreground">Success</p>
                </div>
                <div>
                  <p className="text-lg font-semibold">{wf.enrolledCount}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>

              {wf.lastRunAt && (
                <p className="mt-3 text-xs text-muted-foreground">
                  <Clock className="mr-1 inline h-3 w-3" />
                  Last run {formatRelativeTime(wf.lastRunAt)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
