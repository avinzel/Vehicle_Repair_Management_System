import { useState, useEffect, useCallback, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Outlet, useLocation } from "react-router";

// Static title/subtitle per tab. Dashboard is excluded — it needs a
// dynamic personalized greeting instead, same pattern as ServiceAdvisorPage.
const PAGE_META = {
  '/mechanic/assigned': { title: 'Assigned Repair Orders', subtitle: 'Jobs currently assigned to you' },
  '/mechanic/diagnostic-log': { title: 'Diagnostic Log', subtitle: 'File inspection notes and required services' },
  '/mechanic/part-logger': { title: 'Parts Logger', subtitle: 'Record parts used during a repair' },
};

export function MechanicPage({ user, setUser }) {
  const [tableData, setTableData] = useState([]);
  const [card, setCard] = useState([]);
  const location = useLocation();

  // 1. Stable Fetch Functions
  // NOTE: endpoints below are placeholders following the same
  // ?action= naming convention as ServiceAdvisorPage — confirm the real
  // action names once the Mechanic-side PHP endpoints exist. Both should
  // scope results server-side to the logged-in mechanic (via
  // Auth::getUserId()), not return every order/metric shop-wide.
  const getCardData = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api.php?action=mechanic-reports', {
        credentials: 'include'
      });
      const data = await response.json();
      setCard(data.data || []);
    } catch (err) {
      console.error("Failed to fetch mechanic dashboard reports data", err);
    }
  }, []);

  const getTableData = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api.php?action=mechanic-assigned-orders', {
        credentials: 'include'
      });
      const data = await response.json();
      setTableData(data.data || []);
    } catch (err) {
      console.error("Failed to fetch assigned repair orders data", err);
    }
  }, []);

  // 2. Initial Mount Fetch
  useEffect(() => {
    getCardData();
    getTableData();
  }, [getCardData, getTableData]);

  // 3. Memoized Badge Calculation
  // Assumes the fetch above already scopes to this mechanic's own jobs,
  // so it's a straight count of open ones rather than filtering by
  // mechanic_id client-side.
  const assignedOrdersCount = useMemo(() => {
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

  const meta = location.pathname === '/mechanic'
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
        role="Mechanic"
        userName={displayName}
        user={user}
        setUser={setUser}
        badges={{ assignedOrders: assignedOrdersCount }}
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