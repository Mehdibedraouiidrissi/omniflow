'use client';

import { useState } from 'react';
import { Users, DollarSign, Calendar, Mail, MessageSquare } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

const contactGrowth = [
  { month: 'Jan', contacts: 1200 },
  { month: 'Feb', contacts: 1450 },
  { month: 'Mar', contacts: 1680 },
  { month: 'Apr', contacts: 1920 },
  { month: 'May', contacts: 2100 },
  { month: 'Jun', contacts: 2450 },
  { month: 'Jul', contacts: 2847 },
];

const revenueTrend = [
  { month: 'Jan', revenue: 12000 },
  { month: 'Feb', revenue: 15000 },
  { month: 'Mar', revenue: 18000 },
  { month: 'Apr', revenue: 16000 },
  { month: 'May', revenue: 22000 },
  { month: 'Jun', revenue: 28000 },
  { month: 'Jul', revenue: 32000 },
];

const pipelineStages = [
  { name: 'New Lead', value: 45, color: '#3B82F6' },
  { name: 'Contacted', value: 30, color: '#10B981' },
  { name: 'Qualified', value: 20, color: '#F59E0B' },
  { name: 'Proposal', value: 15, color: '#8B5CF6' },
  { name: 'Negotiation', value: 10, color: '#EC4899' },
  { name: 'Closed Won', value: 25, color: '#06B6D4' },
];

const sourceBreakdown = [
  { name: 'Website', value: 35, color: '#3B82F6' },
  { name: 'Referral', value: 25, color: '#10B981' },
  { name: 'LinkedIn', value: 20, color: '#F59E0B' },
  { name: 'Cold Outreach', value: 12, color: '#8B5CF6' },
  { name: 'Other', value: 8, color: '#94A3B8' },
];

export default function ReportingPage() {
  const [dateRange, setDateRange] = useState('30d');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting"
        description="Analytics and insights for your business"
        actions={
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Contacts" value="2,847" change={12.5} changeLabel="vs prior" icon={Users} />
        <StatCard label="Revenue" value="$152,345" change={23.1} changeLabel="vs prior" icon={DollarSign} />
        <StatCard label="Appointments" value="156" change={8.4} changeLabel="vs prior" icon={Calendar} />
        <StatCard label="Emails Sent" value="12,340" change={15.2} changeLabel="vs prior" icon={Mail} />
        <StatCard label="SMS Sent" value="3,210" change={-2.1} changeLabel="vs prior" icon={MessageSquare} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={contactGrowth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="contacts"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline Stages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pipelineStages}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pipelineStages.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {sourceBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
