'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Tag, Trash2, UserCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { usePaginatedQuery } from '@/hooks/use-api';
import { formatDate, formatRelativeTime } from '@/lib/utils';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  source: string;
  tags: string[];
  owner: { firstName: string; lastName: string } | null;
  lastActivityAt: string | null;
  createdAt: string;
}

const fallbackContacts: Contact[] = [
  { id: '1', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah@example.com', phone: '+1 555-0101', company: 'Acme Corp', status: 'ACTIVE', source: 'Website', tags: ['VIP', 'Enterprise'], owner: { firstName: 'John', lastName: 'Doe' }, lastActivityAt: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: '2', firstName: 'Mike', lastName: 'Chen', email: 'mike@startup.io', phone: '+1 555-0102', company: 'StartupIO', status: 'ACTIVE', source: 'Referral', tags: ['Lead'], owner: { firstName: 'Jane', lastName: 'Smith' }, lastActivityAt: new Date(Date.now() - 7200000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
  { id: '3', firstName: 'Lisa', lastName: 'Park', email: 'lisa@enterprise.com', phone: '+1 555-0103', company: 'Enterprise Co', status: 'ACTIVE', source: 'LinkedIn', tags: ['Hot Lead', 'Enterprise'], owner: null, lastActivityAt: new Date(Date.now() - 10800000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: '4', firstName: 'Tom', lastName: 'Wilson', email: 'tom@agency.co', phone: '+1 555-0104', company: 'Digital Agency', status: 'INACTIVE', source: 'Cold Outreach', tags: ['Agency'], owner: { firstName: 'John', lastName: 'Doe' }, lastActivityAt: null, createdAt: new Date(Date.now() - 86400000 * 60).toISOString() },
  { id: '5', firstName: 'Emma', lastName: 'Davis', email: 'emma@tech.com', phone: '+1 555-0105', company: 'TechCorp', status: 'ACTIVE', source: 'Website', tags: ['Customer'], owner: { firstName: 'Jane', lastName: 'Smith' }, lastActivityAt: new Date(Date.now() - 18000000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
];

export default function ContactsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = usePaginatedQuery<Contact>(
    ['contacts'],
    '/contacts',
    {
      page,
      limit: 25,
      search,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      sort: sortField,
      order: sortOrder,
    },
  );

  const contacts = data?.data ?? fallbackContacts;
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? fallbackContacts.length;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={`${c.firstName} ${c.lastName}`} className="h-8 w-8" />
          <div>
            <p className="font-medium">{c.firstName} {c.lastName}</p>
            <p className="text-xs text-muted-foreground">{c.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', sortable: false },
    { key: 'company', header: 'Company', sortable: true },
    {
      key: 'tags',
      header: 'Tags',
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (c) =>
        c.owner ? `${c.owner.firstName} ${c.owner.lastName}` : <span className="text-muted-foreground">Unassigned</span>,
    },
    {
      key: 'lastActivityAt',
      header: 'Last Activity',
      sortable: true,
      render: (c) =>
        c.lastActivityAt ? formatRelativeTime(c.lastActivityAt) : <span className="text-muted-foreground">None</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (c) => formatDate(c.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description={`${total} total contacts`}
        actions={
          <Button onClick={() => router.push('/contacts?action=new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchInput
          onSearch={handleSearch}
          placeholder="Search contacts..."
          className="sm:w-72"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="UNSUBSCRIBED">Unsubscribed</SelectItem>
          </SelectContent>
        </Select>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <Button variant="outline" size="sm">
              <Tag className="mr-1 h-3.5 w-3.5" />
              Tag
            </Button>
            <Button variant="outline" size="sm">
              <UserCheck className="mr-1 h-3.5 w-3.5" />
              Assign
            </Button>
            <Button variant="outline" size="sm" className="text-destructive">
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={contacts}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(c) => router.push(`/contacts/${c.id}`)}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        total={total}
        isLoading={isLoading}
        emptyMessage="No contacts found. Add your first contact to get started."
      />
    </div>
  );
}
