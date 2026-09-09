

import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Outlet, useLocation } from "react-router"

// Static title/subtitle per tab. Dashboard is intentionally excluded here
// since it needs a dynamic personalized greeting instead — handled below.
const PAGE_META = {
  '/service-advisor/intake': { title: 'New Vehicle Intake', subtitle: 'Register a customer, vehicle, and generate a repair order' },
  '/service-advisor/orders': { title: 'Active Repair Orders', subtitle: 'Track, assign mechanics, and manage ongoing jobs' },
  '/service-advisor/customers': { title: 'Customer & Vehicle Records', subtitle: 'Browse and search your customer directory' },
  '/service-advisor/billing': { title: 'Billing & Invoicing', subtitle: 'Process payments and checkout' },
  '/service-advisor/order-history': { title: 'Repair Order History', subtitle: 'Browse all completed and fulfilled repair orders' },
};

export function ServiceAdvisorPage({ user }) {
  const [activeHref, setActiveHref] = useState('#dashboard');
  const displayName = user?.name ?? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });


  const meta =
    location.pathname === '/service-advisor'
      ? { title: `Great to see you, ${user?.first_name ?? 'there'}!`, subtitle: today }
      : PAGE_META[currentSegment] ?? { title: '', subtitle: '' };

  return (
    <SidebarProvider>
      <AppSidebar role="Service Advisor" userName={displayName} user={user} setUser={setUser} />
      <SidebarInset>
       <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="p-6">
          {activeHref === '#dashboard' && (
            <DashboardTab user={user} metrics={{}} orders={[]} onNavigate={setActiveHref} />
          )}
          {/* other tabs render here as they're built, keyed off activeHref */}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}