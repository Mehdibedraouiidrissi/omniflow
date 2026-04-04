'use client';

import { useState } from 'react';
import {
  Building2, Users, CreditCard, Plug, Key, Globe, Mail,
  Bell, Upload, Trash2, Plus, Copy, Eye, EyeOff,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAvatar } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth-store';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl: string | null;
}

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  createdAt: string;
  lastUsed: string | null;
}

const fallbackMembers: TeamMember[] = [
  { id: '1', name: 'John Doe', email: 'john@omniflow.com', role: 'OWNER', status: 'ACTIVE', avatarUrl: null },
  { id: '2', name: 'Jane Smith', email: 'jane@omniflow.com', role: 'ADMIN', status: 'ACTIVE', avatarUrl: null },
  { id: '3', name: 'Mike Chen', email: 'mike@omniflow.com', role: 'MEMBER', status: 'ACTIVE', avatarUrl: null },
  { id: '4', name: 'Lisa Park', email: 'lisa@omniflow.com', role: 'MEMBER', status: 'INVITED', avatarUrl: null },
];

const fallbackApiKeys: ApiKey[] = [
  { id: '1', name: 'Production API Key', keyPreview: 'nx_live_...a3b4', createdAt: '2024-01-15', lastUsed: '2024-07-10' },
  { id: '2', name: 'Development Key', keyPreview: 'nx_test_...f8g9', createdAt: '2024-03-20', lastUsed: '2024-07-09' },
];

export default function SettingsPage() {
  const { tenant } = useAuthStore();
  const [companyName, setCompanyName] = useState(tenant?.name || 'My Company');
  const [timezone, setTimezone] = useState('America/New_York');

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account and preferences" />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="white-label">White Label</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Company Logo</p>
                  <p className="text-xs text-muted-foreground">Upload a logo for your account</p>
                  <Button variant="outline" size="sm" className="mt-2">Upload</Button>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">GMT (London)</SelectItem>
                      <SelectItem value="Europe/Paris">CET (Paris)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team */}
        <TabsContent value="team">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage who has access to this account</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fallbackMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-md border p-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={member.name} src={member.avatarUrl} className="h-10 w-10" />
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.status === 'ACTIVE' ? 'success' : 'warning'} className="text-xs">
                        {member.status.toLowerCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{member.role.toLowerCase()}</Badge>
                      {member.role !== 'OWNER' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">Professional</p>
                    <p className="text-sm text-muted-foreground">$297/month, billed monthly</p>
                  </div>
                  <Button variant="outline">Upgrade Plan</Button>
                </div>
                <Separator className="my-4" />
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Contacts</p>
                    <p className="text-lg font-semibold">2,847 / 10,000</p>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: '28.5%' }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Emails Sent</p>
                    <p className="text-lg font-semibold">12,340 / 50,000</p>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: '24.7%' }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Team Members</p>
                    <p className="text-lg font-semibold">4 / 10</p>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: '40%' }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect third-party services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Stripe', desc: 'Payment processing', connected: true },
                  { name: 'Twilio', desc: 'SMS and voice', connected: true },
                  { name: 'SendGrid', desc: 'Email delivery', connected: true },
                  { name: 'Google Calendar', desc: 'Calendar sync', connected: false },
                  { name: 'Zapier', desc: 'Workflow automation', connected: false },
                  { name: 'Slack', desc: 'Team notifications', connected: false },
                ].map((integration) => (
                  <div key={integration.name} className="flex items-center justify-between rounded-md border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-semibold text-sm">
                        {integration.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{integration.name}</p>
                        <p className="text-xs text-muted-foreground">{integration.desc}</p>
                      </div>
                    </div>
                    <Button variant={integration.connected ? 'outline' : 'default'} size="sm">
                      {integration.connected ? 'Configure' : 'Connect'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api-keys">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage API keys for programmatic access</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Key
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fallbackApiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between rounded-md border p-4">
                    <div>
                      <p className="text-sm font-medium">{key.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{key.keyPreview}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {key.createdAt}
                        {key.lastUsed && ` | Last used: ${key.lastUsed}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* White Label */}
        <TabsContent value="white-label">
          <Card>
            <CardHeader>
              <CardTitle>White Label Settings</CardTitle>
              <CardDescription>Customize the platform branding for your clients (Agency plan)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Input label="Custom Domain" placeholder="app.yourdomain.com" />
              <Input label="Platform Name" placeholder="Your Platform Name" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Primary Color" type="color" defaultValue="#3B82F6" />
                <Input label="Accent Color" type="color" defaultValue="#10B981" />
              </div>
              <div>
                <Label>Custom Logo</Label>
                <div className="mt-2 flex h-20 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <Button>Save White Label Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>Configure email sending domains and templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-semibold">Verified Domains</h3>
                <div className="space-y-2">
                  {[
                    { domain: 'mail.example.com', status: 'verified' },
                    { domain: 'notify.example.com', status: 'pending' },
                  ].map((d) => (
                    <div key={d.domain} className="flex items-center justify-between rounded-md border p-3">
                      <span className="font-mono text-sm">{d.domain}</span>
                      <Badge variant={d.status === 'verified' ? 'success' : 'warning'} className="text-xs">
                        {d.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-3">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Domain
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { label: 'New contact created', desc: 'When a new contact is added via form or API', key: 'contact' },
                { label: 'New conversation', desc: 'When a new message is received', key: 'conversation' },
                { label: 'Appointment booked', desc: 'When someone books an appointment', key: 'appointment' },
                { label: 'Payment received', desc: 'When a payment is processed', key: 'payment' },
                { label: 'Workflow completed', desc: 'When an automation workflow finishes', key: 'workflow' },
                { label: 'Form submission', desc: 'When a form is submitted', key: 'form' },
              ].map((pref) => (
                <div key={pref.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{pref.label}</p>
                    <p className="text-xs text-muted-foreground">{pref.desc}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Email</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Push</Label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              ))}
              <Button>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
