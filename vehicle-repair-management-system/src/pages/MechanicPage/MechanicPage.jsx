import { useState, useEffect, useCallback, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Outlet, useLocation } from "react-router";
import { normalizeMechanicWorkOrder } from '@/utils/normalizeOrder';

// Static title/subtitle per tab. Dashboard is excluded — it needs a
// dynamic personalized greeting instead, same pattern as ServiceAdvisorPage.
const PAGE_META = {
  '/mechanic/assigned': { title: 'Assigned Repair Orders', subtitle: 'Jobs currently assigned to you' },
  '/mechanic/diagnostic-log': { title: 'Diagnostic Log', subtitle: 'File inspection notes and required services' },
  '/mechanic/part-logger': { title: 'Parts Logger', subtitle: 'Record parts used during a repair' },
};

// Keep in sync with VISIBLE_TO_MECHANIC_STATUSES in AssignedOrders.jsx so
// the sidebar badge counts exactly what the Assigned Orders list shows.
const ACTIONABLE_STATUSES = ["AWAITING_DIAGNOSIS", "PENDING_MECHANICS", "IN_PROGRESS", "AWAITING_PARTS"];

export function MechanicPage({ user, setUser }) {
  const [tableData, setTableData] = useState([]);
  const [card, setCard] = useState([]);
  const location = useLocation();

  // Must match how AssignedOrders/getMyPositionOnOrder identify the viewer.
  const currentUserName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();

  // 1. Stable Fetch Functions

  // TODO: no mechanic dashboard-metrics endpoint exists in api.php yet
  // (the old `mechanic-reports` action returned 404). Kept as a no-op so
  // anything reading `getCardData` from the outlet context doesn't break;
  // wire it to a real action once the backend has one.
  const getCardData = useCallback(async () => {
    setCard([]);
  }, []);

  // Assigned orders for the logged-in mechanic. The backend scopes this
  // via the session (RepairOrderController::getMechanicWorkOrders falls
  // back to Auth::getUserId()), so no mechanic id is sent from here.
  const getTableData = useCallback(async () => {
    try {
      const response = await fetch(
        'http://localhost:8000/api.php?action=repair-orders&category=assigned',
        { credentials: 'include' }
      );
      const json = await response.json();

      // The model method doesn't return a bare array: `data` arrives as an
      // object. Take `data` itself if it's an array, otherwise the first
      // array found inside it (e.g. data.data / data.orders / data.work_orders).
      // TODO: once the PHP model returns the rows directly, drop this and
      // use `json.data` as-is.
      const rows = Array.isArray(json.data)
        ? json.data
        : json.data && typeof json.data === 'object'
          ? Object.values(json.data).find(Array.isArray) ?? null
          : null;

      if (json.status === 'success' && rows) {
        // sp_get_mechanic_work_orders only returns the viewer's own position
        // on each order, so the team is just them for now. Building it here
        // means every page reading tableData gets a complete order shape.
        // TODO: replace once the SP returns the full crew per order.
        setTableData(rows.map(normalizeMechanicWorkOrder));
      } else {
        // Log the whole payload — json.error is undefined when the server
        // "succeeded" but sent an unexpected shape.
        console.error(
          "Unexpected assigned-orders response (HTTP " + response.status + "):",
          JSON.stringify(json, null, 2)
        );
        setTableData([]);
      }
    } catch (err) {
      console.error("Failed to fetch assigned repair orders data", err);
    }
  }, [currentUserName]);

  // 2. Initial Mount Fetch
  useEffect(() => {
    getCardData();
    getTableData();
  }, [getCardData, getTableData]);

  // 3. Memoized Badge Calculation
  // Counts the orders the mechanic can actually act on (same filter as
  // the Assigned Orders list). Using `!== FULFILLED/CANCELLED` here
  // would count invoicing/payment-stage orders the list hides.
  const assignedOrdersCount = useMemo(() => {
    if (!Array.isArray(tableData)) return 0;
    return tableData.filter((item) => ACTIONABLE_STATUSES.includes(item.status)).length;
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