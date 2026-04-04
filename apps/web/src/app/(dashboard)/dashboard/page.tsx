'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useApiQuery } from '@/hooks/use-api';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, DollarSign, Calendar, TrendingUp,
  Plus, UserPlus, Kanban, Share2, Mail,
  Clock, MessageCircle, ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

interface DashboardStats {
  totalContacts: number;
  contactsChange: number;
  openOpportunities: number;
  opportunitiesChange: number;
  revenue: number;
  revenueChange: number;
  appointmentsToday: number;
  appointmentsChange: number;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  contactName: string;
  createdAt: string;
}

interface Appointment {
  id: string;
  title: string;
  contactName: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface Conversation {
  id: string;
  contactName: string;
  lastMessage: string;
  channel: string;
  updatedAt: string;
  unread: boolean;
}

interface PipelineSummary {
  stage: string;
  value: number;
  count: number;
}

const fallbackStats: DashboardStats = {
  totalContacts: 2847,
  contactsChange: 12.5,
  openOpportunities: 156,
  opportunitiesChange: 8.2,
  revenue: 15234500,
  revenueChange: 23.1,
  appointmentsToday: 8,
  appointmentsChange: -5.0,
};

const fallbackPipeline: PipelineSummary[] = [
  { stage: 'New Lead', value: 45000, count: 23 },
  { stage: 'Contacted', value: 62000, count: 18 },
  { stage: 'Qualified', value: 89000, count: 14 },
  { stage: 'Proposal', value: 120000, count: 9 },
  { stage: 'Negotiation', value: 75000, count: 6 },
  { stage: 'Closed Won', value: 156000, count: 12 },
];

const fallbackActivities: Activity[] = [
  { id: '1', type: 'contact_created', description: 'New contact added', contactName: 'Sarah Johnson', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', type: 'email_sent', description: 'Follow-up email sent', contactName: 'Mike Chen', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', type: 'opportunity_won', description: 'Deal closed for $12,500', contactName: 'Lisa Park', createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: '4', type: 'appointment_booked', description: 'Demo scheduled', contactName: 'Tom Wilson', createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: '5', type: 'form_submitted', description: 'Contact form submission', contactName: 'Emma Davis', createdAt: new Date(Date.now() - 18000000).toISOString() },
];

const fallbackAppointments: Appointment[] = [
  { id: '1', title: 'Product Demo', contactName: 'Sarah Johnson', startTime: '10:00 AM', endTime: '10:30 AM', status: 'CONFIRMED' },
  { id: '2', title: 'Onboarding Call', contactName: 'Mike Chen', startTime: '11:00 AM', endTime: '11:45 AM', status: 'SCHEDULED' },
  { id: '3', title: 'Strategy Review', contactName: 'Lisa Park', startTime: '2:00 PM', endTime: '3:00 PM', status: 'CONFIRMED' },
];

const fallbackConversations: Conversation[] = [
  { id: '1', contactName: 'Sarah Johnson', lastMessage: 'Thanks for the follow-up! I\'d love to schedule a demo.', channel: 'EMAIL', updatedAt: new Date(Date.now() - 1800000).toISOString(), unread: true },
  { id: '2', contactName: 'Mike Chen', lastMessage: 'Can you send me the pricing details?', channel: 'SMS', updatedAt: new Date(Date.now() - 5400000).toISOString(), unread: true },
  { id: '3', contactName: 'Lisa Park', lastMessage: 'The proposal looks great, let\'s move forward.', channel: 'WHATSAPP', updatedAt: new Date(Date.now() - 9000000).toISOString(), unread: false },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: stats } = useApiQuery<DashboardStats>(
    ['dashboard', 'stats'],
    '/dashboard/stats',
    { placeholderData: fallbackStats },
  );

  const { data: pipeline } = useApiQuery<PipelineSummary[]>(
    ['dashboard', 'pipeline'],
    '/dashboard/pipeline-summary',
    { placeholderData: fallbackPipeline },
  );

  const { data: activities } = useApiQuery<Activity[]>(
    ['dashboard', 'activities'],
    '/dashboard/recent-activities',
    { placeholderData: fallbackActivities },
  );

  const { data: appointments } = useApiQuery<Appointment[]>(
    ['dashboard', 'appointments'],
    '/dashboard/today-appointments',
    { placeholderData: fallbackAppointments },
  );

  const { data: conversations } = useApiQuery<Conversation[]>(
    ['dashboard', 'conversations'],
    '/dashboard/recent-conversations',
    { placeholderData: fallbackConversations },
  );

  const s = stats || fallbackStats;
  const p = pipeline || fallbackPipeline;
  const acts = activities || fallbackActivities;
  const appts = appointments || fallbackAppointments;
  const convs = conversations || fallbackConversations;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.firstName || 'User'}`}
        description="Here's what's happening with your business today."
      />

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Contacts"
          value={s.totalContacts.toLocaleString()}
          change={s.contactsChange}
          changeLabel="vs last month"
          icon={Users}
        />
        <StatCard
          label="Open Opportunities"
          value={s.openOpportunities.toString()}
          change={s.opportunitiesChange}
          changeLabel="vs last month"
          icon={TrendingUp}
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(s.revenue)}
          change={s.revenueChange}
          changeLabel="vs last month"
          icon={DollarSign}
        />
        <StatCard
          label="Appointments Today"
          value={s.appointmentsToday.toString()}
          change={s.appointmentsChange}
          changeLabel="vs yesterday"
          icon={Calendar}
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/contacts?action=new">
          <Button variant="outline" size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </Link>
        <Link href="/pipelines">
          <Button variant="outline" size="sm">
            <Kanban className="mr-2 h-4 w-4" />
            View Pipeline
          </Button>
        </Link>
        <Link href="/social">
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Schedule Post
          </Button>
        </Link>
        <Link href="/email-marketing">
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Send Email
          </Button>
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pipeline Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pipeline Summary</CardTitle>
            <Link href="/pipelines">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={p}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="stage" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Today&apos;s Appointments</CardTitle>
            <Link href="/calendars">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {appts.map((apt) => (
                <div key={apt.id} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="text-sm font-medium">{apt.title}</p>
                    <p className="text-xs text-muted-foreground">{apt.contactName}</p>
                    <p className="text-xs text-muted-foreground">
                      {apt.startTime} - {apt.endTime}
                    </p>
                  </div>
                  <Badge
                    variant={apt.status === 'CONFIRMED' ? 'success' : 'secondary'}
                    className="text-xs"
                  >
                    {apt.status.toLowerCase()}
                  </Badge>
                </div>
              ))}
              {appts.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No appointments scheduled for today
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {acts.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <UserAvatar name={activity.contactName} className="h-8 w-8" />
                  <div className="flex-1 space-y-0.5">
                    <p className="text-sm">
                      <span className="font-medium">{activity.contactName}</span>
                      {' - '}
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Conversations</CardTitle>
            <Link href="/conversations">
              <Button variant="ghost" size="sm">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {convs.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/conversations?id=${conv.id}`}
                  className="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-muted/50"
                >
                  <div className="relative">
                    <UserAvatar name={conv.contactName} className="h-8 w-8" />
                    {conv.unread && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{conv.contactName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(conv.updatedAt)}
                      </p>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{conv.lastMessage}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {conv.channel}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
