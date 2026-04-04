'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Mail, MessageSquare, Phone, PenLine,
  Plus, Tag, Building2, Globe, MapPin, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useApiQuery } from '@/hooks/use-api';
import { formatDate, formatRelativeTime } from '@/lib/utils';

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  status: string;
  source: string;
  tags: string[];
  avatarUrl: string | null;
  owner: { id: string; firstName: string; lastName: string } | null;
  customFields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  userName: string;
  createdAt: string;
}

const fallbackContact: ContactDetail = {
  id: '1',
  firstName: 'Sarah',
  lastName: 'Johnson',
  email: 'sarah@acmecorp.com',
  phone: '+1 555-0101',
  company: 'Acme Corporation',
  website: 'https://acmecorp.com',
  address: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  country: 'US',
  status: 'ACTIVE',
  source: 'Website',
  tags: ['VIP', 'Enterprise', 'Decision Maker'],
  avatarUrl: null,
  owner: { id: '1', firstName: 'John', lastName: 'Doe' },
  customFields: { 'Job Title': 'VP of Marketing', 'Team Size': '25-50', 'Budget': '$10K-$50K' },
  createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  updatedAt: new Date(Date.now() - 3600000).toISOString(),
};

const fallbackActivities: ActivityItem[] = [
  { id: '1', type: 'email', description: 'Follow-up email sent regarding proposal', userName: 'John Doe', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', type: 'note', description: 'Had a great discovery call. Very interested in our Enterprise plan.', userName: 'Jane Smith', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '3', type: 'call', description: 'Initial outreach call - 15 min', userName: 'John Doe', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: '4', type: 'stage_change', description: 'Moved from New Lead to Qualified', userName: 'System', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: '5', type: 'tag_added', description: 'Tag "VIP" added', userName: 'John Doe', createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
];

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params['id'] as string;

  const { data: contact } = useApiQuery<ContactDetail>(
    ['contacts', id],
    `/contacts/${id}`,
    { placeholderData: fallbackContact },
  );

  const { data: activities } = useApiQuery<ActivityItem[]>(
    ['contacts', id, 'activities'],
    `/contacts/${id}/activities`,
    { placeholderData: fallbackActivities },
  );

  const c = contact || fallbackContact;
  const acts = activities || fallbackActivities;
  const fullName = `${c.firstName} ${c.lastName}`;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Contacts
        </Button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar name={fullName} src={c.avatarUrl} className="h-16 w-16 text-lg" />
            <div>
              <h1 className="text-2xl font-bold">{fullName}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {c.company}
                <span className="text-muted-foreground/50">|</span>
                <span>Source: {c.source}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {c.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <PenLine className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="mr-1 h-3.5 w-3.5" />
              Email
            </Button>
            <Button variant="outline" size="sm">
              <MessageSquare className="mr-1 h-3.5 w-3.5" />
              SMS
            </Button>
            <Button variant="outline" size="sm">
              <Phone className="mr-1 h-3.5 w-3.5" />
              Call
            </Button>
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Note
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow icon={Mail} label="Email" value={c.email} />
                <InfoRow icon={Phone} label="Phone" value={c.phone} />
                <InfoRow icon={Building2} label="Company" value={c.company} />
                <InfoRow icon={Globe} label="Website" value={c.website} />
                <InfoRow
                  icon={MapPin}
                  label="Address"
                  value={[c.address, c.city, c.state, c.country].filter(Boolean).join(', ')}
                />
                <Separator />
                <InfoRow icon={Tag} label="Status" value={c.status} />
                <InfoRow icon={Clock} label="Created" value={formatDate(c.createdAt)} />
                <InfoRow icon={Clock} label="Last Updated" value={formatRelativeTime(c.updatedAt)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custom Fields</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(c.customFields).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(c.customFields).map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{key}</span>
                        <span className="text-sm font-medium">{val}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No custom fields</p>
                )}

                <Separator className="my-4" />

                <div>
                  <h4 className="mb-2 text-sm font-medium">Owner</h4>
                  {c.owner ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar name={`${c.owner.firstName} ${c.owner.lastName}`} className="h-6 w-6" />
                      <span className="text-sm">{c.owner.firstName} {c.owner.lastName}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Unassigned</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {acts.map((act) => (
                  <div key={act.id} className="flex gap-4">
                    <div className="relative flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <ActivityIcon type={act.type} />
                      </div>
                      <div className="flex-1 border-l border-dashed" />
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="text-sm">{act.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {act.userName} &middot; {formatRelativeTime(act.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversations */}
        <TabsContent value="conversations">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No conversations yet. Start a conversation with this contact.
            </CardContent>
          </Card>
        </TabsContent>

        {/* Opportunities */}
        <TabsContent value="opportunities">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No opportunities linked to this contact.
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No tasks assigned for this contact.
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No notes yet. Add a note about this contact.
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files */}
        <TabsContent value="files">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No files uploaded for this contact.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="w-24 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || '-'}</span>
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  switch (type) {
    case 'email': return <Mail className="h-4 w-4 text-muted-foreground" />;
    case 'call': return <Phone className="h-4 w-4 text-muted-foreground" />;
    case 'note': return <PenLine className="h-4 w-4 text-muted-foreground" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}
