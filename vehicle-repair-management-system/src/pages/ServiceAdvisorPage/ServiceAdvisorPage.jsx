import { useState, useEffect, useCallback, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Outlet, useLocation } from "react-router";

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
  const [card, setCard] = useState([]);
  const location = useLocation();

  // 1. Stable Fetch Functions
  const getCardData = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api.php?action=reports', {
        credentials: 'include'
      });
      const data = await response.json();
      setCard(data.data || []);
    } catch (err) {
      console.error("Failed to fetch dashboard reports data", err);
    }
  }, []);

  const getTableData = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api.php?action=repair-orders', {
        credentials: 'include'
      });
      const data = await response.json();
      setTableData(data.data || []);
    } catch (err) {
      console.error("Failed to fetch repair orders data", err);
    }
  }, []);

  // 2. Initial Mount Fetch
  useEffect(() => {
    getCardData();
    getTableData();
  }, [getCardData, getTableData]);

  // 3. Memoized Badge Calculation
  const activeOrdersCount = useMemo(() => {
    if (!Array.isArray(tableData)) return 0;
    return tableData.reduce((count, item) => {
      return item.status !== 'FULFILLED' && item.status !== 'CANCELLED' ? count + 1 : count;
    }, 0);
  }, [tableData]);

  // 4. Metadata and User Format
  const currentSegment = location.pathname;
  const displayName = user?.name ?? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const meta = location.pathname === '/service-advisor'
    ? { title: `Great to see you, ${user?.first_name ?? 'there'}!`, subtitle: today }
    : PAGE_META[currentSegment] ?? { title: '', subtitle: '' };

  // 5. Memoized Outlet Context Object
  const outletContextValue = useMemo(() => ({
    user,
    setUser,
    tableData,
    setTableData,
    card,
    setCard,
    getCardData,
    getTableData,
  }), [user, setUser, tableData, card, getCardData, getTableData]);

  return (
    <SidebarProvider>
      <AppSidebar 
        role="Service Advisor" 
        userName={displayName} 
        user={user} 
        setUser={setUser} 
        tableData={tableData} 
        badges={{ activeOrders: activeOrdersCount, lowStock: 2, assignedOrders: 3 }}
      />
      <SidebarInset>
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="p-6">
          <Outlet context={outletContextValue} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}