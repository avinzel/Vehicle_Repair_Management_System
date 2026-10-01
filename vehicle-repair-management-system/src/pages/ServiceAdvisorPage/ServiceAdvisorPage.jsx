import { useState, useEffect, useCallback, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Outlet, useLocation } from "react-router";
import { normalizeActiveOrderRow, normalizeBillingRow } from '@/utils/normalizeOrder';

const API = 'http://localhost:8000/api.php';

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
  // Each dataset comes from a different stored procedure with a different
  // row shape, so they can't share one array:
  //   tableData     -> sp_populate_dashboard_table   (dashboard, compact rows)
  //   card          -> sp_populate_dashboard_cards   (dashboard metrics)
  //   activeOrders  -> sp_get_active_repair_orders   (Active Repair Orders)
  //   billingOrders -> sp_get_billing_and_invoicing  (Billing & Invoicing)
  const [tableData, setTableData] = useState([]);
  const [card, setCard] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [billingOrders, setBillingOrders] = useState([]);
  const location = useLocation();

  // 1. Stable Fetch Functions
  const getCardData = useCallback(async () => {
    try {
      const response = await fetch(`${API}?action=reports`, { credentials: 'include' });
      const data = await response.json();
      setCard(data.data || []);
    } catch (err) {
      console.error("Failed to fetch dashboard reports data", err);
    }
  }, []);

  const getTableData = useCallback(async () => {
    try {
      const response = await fetch(`${API}?action=repair-orders`, { credentials: 'include' });
      const data = await response.json();
      setTableData(data.data || []);
    } catch (err) {
      console.error("Failed to fetch repair orders data", err);
    }
  }, []);

  // Status/search filtering happens client-side in the pages, so we always
  // fetch the full set (status defaults to ALL server-side).
  const getActiveOrders = useCallback(async () => {
    try {
      const response = await fetch(
        `${API}?action=repair-orders&category=active`,
        { credentials: 'include' }
      );
      const json = await response.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        setActiveOrders(json.data.map(normalizeActiveOrderRow));
      } else {
        console.error("Failed to fetch active orders:", json.error ?? json);
      }
    } catch (err) {
      console.error("Failed to fetch active orders", err);
    }
  }, []);

  // Route: repair-orders&category=inactive -> InvoiceController::
  // getBillingAndInvoicingRecords. (The old page called action=invoices
  // with no order_id, which api.php never routes to the list handler.)
  const getBillingOrders = useCallback(async () => {
    try {
      const response = await fetch(
        `${API}?action=repair-orders&category=inactive`,
        { credentials: 'include' }
      );
      const json = await response.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        setBillingOrders(json.data.map(normalizeBillingRow));
      } else {
        console.error("Failed to fetch billing orders:", json.error ?? json);
      }
    } catch (err) {
      console.error("Failed to fetch billing orders", err);
    }
  }, []);

  // Any status change (assign diagnostician, invoice, payment...) touches
  // the dashboard, the active list, and the billing list at once — pages
  // call this after a mutation instead of refetching only their own slice.
  const refreshOrders = useCallback(
    () => Promise.all([getCardData(), getTableData(), getActiveOrders(), getBillingOrders()]),
    [getCardData, getTableData, getActiveOrders, getBillingOrders]
  );

  // 2. Initial Mount Fetch
  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  // 3. Memoized Badge Calculation
  // Derived from activeOrders so the badge counts exactly what the Active
  // Repair Orders list shows (that SP already excludes READY_TO_INVOICE,
  // AWAITING_PAYMENT, READY_FOR_RELEASE, FULFILLED, CANCELLED).
  const activeOrdersCount = useMemo(
    () => (Array.isArray(activeOrders) ? activeOrders.length : 0),
    [activeOrders]
  );

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
    // dashboard
    tableData,
    setTableData,
    card,
    setCard,
    getTableData,
    getCardData,
    // active repair orders
    activeOrders,
    setActiveOrders,
    getActiveOrders,
    // billing & invoicing
    billingOrders,
    setBillingOrders,
    getBillingOrders,
    // refetch everything after a mutation
    refreshOrders,
  }), [
    user, setUser,
    tableData, card, getTableData, getCardData,
    activeOrders, getActiveOrders,
    billingOrders, getBillingOrders,
    refreshOrders,
  ]);

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