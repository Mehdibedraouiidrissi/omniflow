'use client';

import { DollarSign, CreditCard, RefreshCw, Clock, Plus, MoreHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/ui/data-table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useApiQuery } from '@/hooks/use-api';

interface Transaction {
  id: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  status: string;
  type: string;
  productName: string;
  createdAt: string;
}

const fallbackTransactions: Transaction[] = [
  { id: '1', customerName: 'Sarah Johnson', customerEmail: 'sarah@acme.com', amount: 9900, status: 'PAID', type: 'ONE_TIME', productName: 'Pro Plan', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', customerName: 'Mike Chen', customerEmail: 'mike@startup.io', amount: 29900, status: 'PAID', type: 'RECURRING', productName: 'Enterprise Monthly', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', customerName: 'Lisa Park', customerEmail: 'lisa@enterprise.com', amount: 49900, status: 'PAID', type: 'ONE_TIME', productName: 'Consulting Package', createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: '4', customerName: 'Tom Wilson', customerEmail: 'tom@agency.co', amount: 19900, status: 'PENDING', type: 'RECURRING', productName: 'Agency Plan', createdAt: new Date(Date.now() - 18000000).toISOString() },
  { id: '5', customerName: 'Emma Davis', customerEmail: 'emma@tech.com', amount: 14900, status: 'REFUNDED', type: 'ONE_TIME', productName: 'Workshop', createdAt: new Date(Date.now() - 86400000).toISOString() },
];

const statusColors: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PAID: 'success',
  PENDING: 'warning',
  FAILED: 'destructive',
  REFUNDED: 'secondary',
};

export default function PaymentsPage() {
  const columns: Column<Transaction>[] = [
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      render: (t) => (
        <div>
          <p className="font-medium">{t.customerName}</p>
          <p className="text-xs text-muted-foreground">{t.customerEmail}</p>
        </div>
      ),
    },
    { key: 'productName', header: 'Product', sortable: true },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (t) => <span className="font-medium">{formatCurrency(t.amount)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (t) => (
        <Badge variant="outline" className="text-xs">
          {t.type === 'RECURRING' ? 'Recurring' : 'One-time'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <Badge variant={statusColors[t.status] || 'secondary'} className="text-xs">
          {t.status.toLowerCase()}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (t) => formatDate(t.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Manage your revenue and transactions"
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Product
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatCurrency(24560000)} change={18.3} changeLabel="vs last month" icon={DollarSign} />
        <StatCard label="Subscriptions" value="142" change={5.2} changeLabel="vs last month" icon={RefreshCw} />
        <StatCard label="One-time Sales" value="87" change={12.1} changeLabel="vs last month" icon={CreditCard} />
        <StatCard label="Pending" value={formatCurrency(3980000)} change={-2.4} changeLabel="vs last month" icon={Clock} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <DataTable
            columns={columns}
            data={fallbackTransactions}
            page={1}
            totalPages={1}
            onPageChange={() => {}}
            emptyMessage="No orders yet"
          />
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Active subscriptions will appear here
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Invoices will appear here
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Your products catalog will appear here
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
