'use client';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { CommandPalette } from '@/components/ui/command-palette';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { sidebarCollapsed, sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar />
      <Header />
      <CommandPalette />

      <main
        className={cn(
          'pt-16 transition-all duration-300',
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64',
        )}
      >
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
