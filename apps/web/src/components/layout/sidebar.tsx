'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, MessageCircle, Kanban, Calendar,
  GitBranch, FileText, Globe, Mail, Share2, GraduationCap,
  Star, CreditCard, BarChart3, Settings, Shield, ChevronLeft,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const mainNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Contacts', href: '/contacts', icon: Users },
  { label: 'Conversations', href: '/conversations', icon: MessageCircle },
  { label: 'Pipelines', href: '/pipelines', icon: Kanban },
  { label: 'Calendars', href: '/calendars', icon: Calendar },
  { label: 'Workflows', href: '/workflows', icon: GitBranch },
  { label: 'Forms & Surveys', href: '/forms', icon: FileText },
  { label: 'Websites & Funnels', href: '/websites', icon: Globe },
  { label: 'Email Marketing', href: '/email-marketing', icon: Mail },
  { label: 'Social Planner', href: '/social', icon: Share2 },
  { label: 'Memberships', href: '/memberships', icon: GraduationCap },
  { label: 'Reputation', href: '/reputation', icon: Star },
  { label: 'Payments', href: '/payments', icon: CreditCard },
  { label: 'Reporting', href: '/reporting', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const adminNavItems = [
  { label: 'Admin Console', href: '/admin', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { user, tenant, setTenant } = useAuthStore();

  const isAdmin = user?.memberships?.some((m) => m.role === 'OWNER' || m.role === 'ADMIN');

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col border-r bg-card transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Header / Tenant Switcher */}
        <div className={cn('flex h-16 items-center border-b px-4', sidebarCollapsed && 'justify-center px-2')}>
          {sidebarCollapsed ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">
              N
            </div>
          ) : (
            <div className="flex w-full items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">
                N
              </div>
              {user && user.memberships.length > 1 ? (
                <Select
                  value={tenant?.id}
                  onValueChange={(id) => {
                    const m = user.memberships.find((mem) => mem.tenant.id === id);
                    if (m) setTenant(m.tenant);
                  }}
                >
                  <SelectTrigger className="h-8 flex-1 border-0 bg-transparent text-sm font-semibold shadow-none">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {user.memberships.map((m) => (
                      <SelectItem key={m.tenant.id} value={m.tenant.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5" />
                          {m.tenant.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="truncate text-sm font-semibold">{tenant?.name || 'Omniflow'}</span>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-1 px-2">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              const link = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    sidebarCollapsed && 'justify-center px-2',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return link;
            })}
          </nav>

          {isAdmin && (
            <>
              <Separator className="mx-4 my-2" />
              <nav className="space-y-1 px-2">
                {adminNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  const link = (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        sidebarCollapsed && 'justify-center px-2',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  );

                  if (sidebarCollapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    );
                  }

                  return link;
                })}
              </nav>
            </>
          )}
        </ScrollArea>

        {/* Collapse Toggle */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn('w-full', sidebarCollapsed && 'px-2')}
            onClick={toggleSidebarCollapsed}
          >
            <ChevronLeft
              className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')}
            />
            {!sidebarCollapsed && <span className="ml-2">Collapse</span>}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
