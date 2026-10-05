import { useState, useEffect, useCallback, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Outlet, useLocation } from "react-router";

// Static title/subtitle per tab. The dashboard ('/admin') is excluded
// since it needs the personalized greeting. Add each new admin tab here
// as it's built.
const PAGE_META = {
  '/admin/staff': { title: 'Staff Management', subtitle: 'Manage staff accounts, roles, and access' },
  '/admin/mechanics': { title: 'Mechanic Management', subtitle: 'Manage mechanic profiles, specializations, and availability' },
  '/admin/parts': { title: 'Parts Inventory', subtitle: 'Monitor stock levels and restock parts' },
  '/admin/reports': { title: 'Reports & Analytics', subtitle: 'View revenue, service trends, and inventory usage' },
};

export function AdminPage({ user, setUser }) {
  const [tableData, setTableData] = useState([]);
  const [card, setCard] = useState([]);
  const location = useLocation();

  // 1. Stable Fetch Functions
  const getCardData = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api.php?action=reports', {
        credentials: 'include',
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
        credentials: 'include',
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

  // 3. Metadata and User Format
  const displayName = user?.name ?? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const meta = location.pathname === '/admin'
    ? { title: `Great to see you, ${user?.first_name ?? 'there'}!`, subtitle: today }
    : PAGE_META[location.pathname] ?? { title: '', subtitle: '' };

  // 4. Memoized Outlet Context Object
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
      <AppSidebar role="Admin" userName={displayName} user={user} setUser={setUser} />
      <SidebarInset>
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="p-6">
          <Outlet context={outletContextValue} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}