'use client';

import { Plus, Globe, MoreHorizontal, ExternalLink, FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApiQuery } from '@/hooks/use-api';

interface Site {
  id: string;
  name: string;
  domain: string;
  status: string;
  pagesCount: number;
  type: 'website' | 'funnel';
  updatedAt: string;
}

const fallbackWebsites: Site[] = [
  { id: '1', name: 'Main Website', domain: 'www.example.com', status: 'PUBLISHED', pagesCount: 12, type: 'website', updatedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', name: 'Landing Page - Q1 Campaign', domain: 'promo.example.com', status: 'PUBLISHED', pagesCount: 3, type: 'website', updatedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '3', name: 'New Blog Design', domain: '', status: 'DRAFT', pagesCount: 5, type: 'website', updatedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
];

const fallbackFunnels: Site[] = [
  { id: '4', name: 'Free Trial Funnel', domain: 'try.example.com', status: 'PUBLISHED', pagesCount: 4, type: 'funnel', updatedAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '5', name: 'Webinar Registration', domain: 'webinar.example.com', status: 'PUBLISHED', pagesCount: 3, type: 'funnel', updatedAt: new Date(Date.now() - 14400000).toISOString() },
  { id: '6', name: 'Product Launch Funnel', domain: '', status: 'DRAFT', pagesCount: 6, type: 'funnel', updatedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
];

function SiteGrid({ sites, type }: { sites: Site[]; type: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sites.map((site) => (
        <Card key={site.id} className="transition-shadow hover:shadow-md">
          <CardContent className="p-0">
            <div className="flex h-36 items-center justify-center rounded-t-lg bg-muted">
              <Globe className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{site.name}</p>
                  {site.domain && (
                    <p className="text-xs text-muted-foreground">{site.domain}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><ExternalLink className="mr-2 h-3.5 w-3.5" />Preview</DropdownMenuItem>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge
                  variant={site.status === 'PUBLISHED' ? 'success' : 'secondary'}
                  className="text-xs"
                >
                  {site.status.toLowerCase()}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  {site.pagesCount} pages
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function WebsitesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Websites & Funnels"
        description="Build and manage your web presence"
      />

      <Tabs defaultValue="websites">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="websites">Websites</TabsTrigger>
            <TabsTrigger value="funnels">Funnels</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Website
            </Button>
          </div>
        </div>

        <TabsContent value="websites">
          <SiteGrid sites={fallbackWebsites} type="website" />
        </TabsContent>
        <TabsContent value="funnels">
          <SiteGrid sites={fallbackFunnels} type="funnel" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
