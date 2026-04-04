'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Play, Pause, TestTube, Plus,
  Mail, MessageSquare, Clock, GitBranch, Tag,
  Bell, Webhook, ArrowDown, Settings, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface WorkflowStep {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  position: number;
}

interface WorkflowDetail {
  id: string;
  name: string;
  status: string;
  triggerType: string;
  steps: WorkflowStep[];
}

const stepIcons: Record<string, React.ElementType> = {
  SEND_EMAIL: Mail,
  SEND_SMS: MessageSquare,
  WAIT: Clock,
  IF_ELSE: GitBranch,
  ADD_TAG: Tag,
  REMOVE_TAG: Tag,
  NOTIFICATION: Bell,
  WEBHOOK: Webhook,
};

const stepPalette = [
  { type: 'SEND_EMAIL', label: 'Send Email', icon: Mail },
  { type: 'SEND_SMS', label: 'Send SMS', icon: MessageSquare },
  { type: 'WAIT', label: 'Wait / Delay', icon: Clock },
  { type: 'IF_ELSE', label: 'If / Else', icon: GitBranch },
  { type: 'ADD_TAG', label: 'Add Tag', icon: Tag },
  { type: 'NOTIFICATION', label: 'Send Notification', icon: Bell },
  { type: 'WEBHOOK', label: 'Webhook', icon: Webhook },
];

const fallbackWorkflow: WorkflowDetail = {
  id: '1',
  name: 'New Lead Follow-up',
  status: 'ACTIVE',
  triggerType: 'CONTACT_CREATED',
  steps: [
    { id: 's1', type: 'SEND_EMAIL', name: 'Welcome Email', config: { subject: 'Welcome to Omniflow!', templateId: 'welcome-1' }, position: 0 },
    { id: 's2', type: 'WAIT', name: 'Wait 1 Day', config: { duration: 1, unit: 'days' }, position: 1 },
    { id: 's3', type: 'SEND_SMS', name: 'Follow-up SMS', config: { message: 'Hi {{firstName}}, just checking in!' }, position: 2 },
    { id: 's4', type: 'WAIT', name: 'Wait 3 Days', config: { duration: 3, unit: 'days' }, position: 3 },
    { id: 's5', type: 'IF_ELSE', name: 'Check Email Opened', config: { condition: 'email_opened', stepId: 's1' }, position: 4 },
    { id: 's6', type: 'SEND_EMAIL', name: 'Second Follow-up', config: { subject: 'Did you see our email?', templateId: 'followup-1' }, position: 5 },
    { id: 's7', type: 'ADD_TAG', name: 'Tag as Engaged', config: { tag: 'Engaged' }, position: 6 },
  ],
};

export default function WorkflowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const [workflow, setWorkflow] = useState(fallbackWorkflow);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState(workflow.name);

  const selectedStep = workflow.steps.find((s) => s.id === selectedStepId);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="h-8 w-64 border-0 text-lg font-semibold shadow-none focus-visible:ring-0"
          />
          <Badge variant={workflow.status === 'ACTIVE' ? 'success' : 'secondary'}>
            {workflow.status.toLowerCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <TestTube className="mr-1 h-3.5 w-3.5" />
            Test
          </Button>
          <Button variant="outline" size="sm">
            <Save className="mr-1 h-3.5 w-3.5" />
            Save
          </Button>
          <Button size="sm">
            <Play className="mr-1 h-3.5 w-3.5" />
            Publish
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Step Palette */}
        <div className="w-56 border-r">
          <div className="p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Actions</p>
            <div className="space-y-1">
              {stepPalette.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                    onClick={() => {
                      const newStep: WorkflowStep = {
                        id: `s${Date.now()}`,
                        type: item.type,
                        name: item.label,
                        config: {},
                        position: workflow.steps.length,
                      };
                      setWorkflow({
                        ...workflow,
                        steps: [...workflow.steps, newStep],
                      });
                      setSelectedStepId(newStep.id);
                    }}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center - Workflow Canvas */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center py-8">
            {/* Trigger Node */}
            <Card className="w-72 border-2 border-primary/30 bg-primary/5">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-primary p-2">
                  <Play className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Trigger</p>
                  <p className="text-xs text-muted-foreground">
                    {workflow.triggerType.replace(/_/g, ' ').toLowerCase()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Steps */}
            {workflow.steps.map((step, index) => {
              const Icon = stepIcons[step.type] || Settings;
              const isSelected = selectedStepId === step.id;

              return (
                <div key={step.id} className="flex flex-col items-center">
                  {/* Arrow */}
                  <div className="flex h-8 items-center">
                    <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Step Card */}
                  <Card
                    className={cn(
                      'w-72 cursor-pointer transition-all',
                      isSelected && 'ring-2 ring-primary',
                    )}
                    onClick={() => setSelectedStepId(step.id)}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="rounded-lg bg-muted p-2">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{step.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {step.type.replace(/_/g, ' ').toLowerCase()}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">#{index + 1}</span>
                    </CardContent>
                  </Card>
                </div>
              );
            })}

            {/* Add Step */}
            <div className="flex h-8 items-center">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>
            <Button variant="outline" className="w-72 border-2 border-dashed" onClick={() => {}}>
              <Plus className="mr-2 h-4 w-4" />
              Add Step
            </Button>
          </div>
        </ScrollArea>

        {/* Right Panel - Step Config */}
        {selectedStep && (
          <div className="w-80 border-l">
            <div className="flex items-center justify-between border-b p-3">
              <p className="text-sm font-semibold">Configure Step</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => {
                  setWorkflow({
                    ...workflow,
                    steps: workflow.steps.filter((s) => s.id !== selectedStepId),
                  });
                  setSelectedStepId(null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <Input
                label="Step Name"
                value={selectedStep.name}
                onChange={(e) => {
                  setWorkflow({
                    ...workflow,
                    steps: workflow.steps.map((s) =>
                      s.id === selectedStepId ? { ...s, name: e.target.value } : s,
                    ),
                  });
                }}
              />

              <div className="rounded-md bg-muted p-3">
                <p className="text-xs font-medium text-muted-foreground">Type</p>
                <p className="text-sm">{selectedStep.type.replace(/_/g, ' ')}</p>
              </div>

              <div className="rounded-md bg-muted p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Configuration</p>
                <pre className="text-xs text-muted-foreground overflow-x-auto">
                  {JSON.stringify(selectedStep.config, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
