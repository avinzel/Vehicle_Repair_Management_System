

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

export function ServiceAdvisorPage({ user, setUser }) {

  const [tableData, setTableData] = useState([]);
  const [card, setCard] = useState([])
  async function getCardData() {
    try {
      const response = await fetch('http://localhost:8000/api.php?action=reports', {
        credentials: 'include'
      });
      const data = await response.json();
      setCard(data.data || []);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    }
  }

    async function getTableData() {
    try {
      const response = await fetch('http://localhost:8000/api.php?action=repair-orders', {
        credentials: 'include'
      });
      const data = await response.json();
      setTableData(data.data || []);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    }
  }

  function getActiveOrdersCount(tableData) {
      if (!Array.isArray(tableData)) return 0;
      
      let activeCount = 0;
      for (let i = 0; i < tableData.length; i++) {
          if (tableData[i].status !== 'FULFILLED' && tableData[i].status !== 'CANCELLED') {
              activeCount++;
          }
      }
      console.log(activeCount)
      return activeCount;
  }

  useEffect(() => {
    // { activeOrders: 7, lowStock: 2, assignedOrders: 3 }
    getCardData();
    getTableData();
  }, []);
  const location = useLocation();

  const currentSegment = location.pathname;

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
      <AppSidebar role="Service Advisor" userName={displayName} user={user} setUser={setUser} tableData = {tableData} badges = {{ activeOrders: getActiveOrdersCount(tableData), lowStock: 2, assignedOrders: 3 }}/>
      <SidebarInset>
       <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="p-6">
          <Outlet context={{ user, setUser, tableData,setTableData,card, setCard }} />
          {/* other tabs render here as they're built, keyed off activeHref */}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}







