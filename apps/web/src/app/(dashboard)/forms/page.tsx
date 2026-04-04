'use client';

import { Plus, FileText, MoreHorizontal, ExternalLink, Copy, Archive } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApiQuery } from '@/hooks/use-api';
import { formatDate } from '@/lib/utils';

interface Form {
  id: string;
  name: string;
  type: string;
  status: string;
  submissionCount: number;
  lastSubmissionAt: string | null;
  createdAt: string;
}

const fallbackForms: Form[] = [
  { id: '1', name: 'Contact Us Form', type: 'FORM', status: 'PUBLISHED', submissionCount: 342, lastSubmissionAt: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 60).toISOString() },
  { id: '2', name: 'Customer Satisfaction Survey', type: 'SURVEY', status: 'PUBLISHED', submissionCount: 128, lastSubmissionAt: new Date(Date.now() - 7200000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: '3', name: 'Lead Capture Form', type: 'FORM', status: 'PUBLISHED', submissionCount: 567, lastSubmissionAt: new Date(Date.now() - 1800000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 90).toISOString() },
  { id: '4', name: 'Onboarding Questionnaire', type: 'QUIZ', status: 'DRAFT', submissionCount: 0, lastSubmissionAt: null, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: '5', name: 'Event Registration', type: 'FORM', status: 'PUBLISHED', submissionCount: 89, lastSubmissionAt: new Date(Date.now() - 14400000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 14).toISOString() },
  { id: '6', name: 'NPS Survey', type: 'SURVEY', status: 'ARCHIVED', submissionCount: 456, lastSubmissionAt: new Date(Date.now() - 86400000 * 30).toISOString(), createdAt: new Date(Date.now() - 86400000 * 180).toISOString() },
];

const typeLabels: Record<string, string> = { FORM: 'Form', SURVEY: 'Survey', QUIZ: 'Quiz' };

export default function FormsPage() {
  const { data: forms } = useApiQuery<Form[]>(
    ['forms'],
    '/forms',
    { placeholderData: fallbackForms },
  );

  const allForms = forms || fallbackForms;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Forms & Surveys"
        description="Create forms to capture leads and feedback"
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Form
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allForms.map((form) => (
          <Card key={form.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-muted p-2.5">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{form.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{typeLabels[form.type]}</Badge>
                      <Badge
                        variant={form.status === 'PUBLISHED' ? 'success' : form.status === 'DRAFT' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {form.status.toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><ExternalLink className="mr-2 h-3.5 w-3.5" />View Submissions</DropdownMenuItem>
                    <DropdownMenuItem><Copy className="mr-2 h-3.5 w-3.5" />Duplicate</DropdownMenuItem>
                    <DropdownMenuItem><Archive className="mr-2 h-3.5 w-3.5" />Archive</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-xl font-semibold">{form.submissionCount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Submissions</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {form.lastSubmissionAt ? `Last: ${formatDate(form.lastSubmissionAt)}` : 'No submissions'}
                  </p>
                  <p className="text-xs text-muted-foreground">Created {formatDate(form.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
