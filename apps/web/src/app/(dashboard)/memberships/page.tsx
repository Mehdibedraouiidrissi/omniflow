'use client';

import { Plus, GraduationCap, Users, BookOpen, MoreHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Course {
  id: string;
  name: string;
  description: string;
  studentsCount: number;
  lessonsCount: number;
  status: string;
  accessType: string;
  thumbnailUrl: string | null;
}

const fallbackCourses: Course[] = [
  { id: '1', name: 'Marketing Masterclass', description: 'Complete guide to digital marketing strategies', studentsCount: 234, lessonsCount: 24, status: 'PUBLISHED', accessType: 'PAID', thumbnailUrl: null },
  { id: '2', name: 'Sales Fundamentals', description: 'Learn the basics of B2B sales', studentsCount: 156, lessonsCount: 16, status: 'PUBLISHED', accessType: 'FREE', thumbnailUrl: null },
  { id: '3', name: 'Advanced SEO Course', description: 'Deep dive into technical and content SEO', studentsCount: 89, lessonsCount: 32, status: 'PUBLISHED', accessType: 'PAID', thumbnailUrl: null },
  { id: '4', name: 'Email Marketing 101', description: 'Build effective email campaigns', studentsCount: 0, lessonsCount: 8, status: 'DRAFT', accessType: 'MEMBERSHIP', thumbnailUrl: null },
];

export default function MembershipsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Memberships & Courses"
        description="Create and manage online courses"
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fallbackCourses.map((course) => (
          <Card key={course.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-0">
              <div className="flex h-36 items-center justify-center rounded-t-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <GraduationCap className="h-12 w-12 text-primary/40" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{course.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit Course</DropdownMenuItem>
                      <DropdownMenuItem>Manage Lessons</DropdownMenuItem>
                      <DropdownMenuItem>View Students</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Badge
                    variant={course.status === 'PUBLISHED' ? 'success' : 'secondary'}
                    className="text-xs"
                  >
                    {course.status.toLowerCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {course.accessType.toLowerCase()}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {course.studentsCount} students
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {course.lessonsCount} lessons
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
