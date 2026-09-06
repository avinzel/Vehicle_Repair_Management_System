import { Menu } from 'lucide-react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import {Outlet} from "react-router"
import { AppSidebar } from '@/components/Sidebar';

export function ServiceAdvisorPage({ user ,setUser }) {
  const displayName = user?.name ?? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();

  return (
    <SidebarProvider>
      <AppSidebar role="Service Advisor" userName={displayName} setUser = {setUser}  user = {user} />
      <SidebarInset>
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          <SidebarTrigger>
            <button className="p-1.5 rounded-lg hover:bg-secondary" aria-label="Toggle sidebar">
              <Menu className="w-4 h-4" />
            </button>
          </SidebarTrigger>
          <p className="text-sm font-medium">Service advisor dashboard</p>
        </header>
        <main className="p-6"><Outlet /></main>
      </SidebarInset>
    </SidebarProvider>
  );
}