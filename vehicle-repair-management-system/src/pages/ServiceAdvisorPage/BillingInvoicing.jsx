"use client"

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useOutletContext } from "react-router";
import { OrderFilterBar } from "@/components/OrderSearchFilter";
import { OrderCard } from "@/components/OrderCard";
import { DetailDrawer } from "@/components/DetailDrawer";
import { InvoiceDetail } from "@/components/InvoiceDetail";
import { formatStatusLabel } from "@/utils/formatStatusLabel";

// This page covers the financial tail of the pipeline — everything from
// "repair done, needs invoicing" through "paid and released", plus the
// historical Fulfilled orders for reference. It deliberately does NOT
// include earlier statuses (Pending Diagnosis through Awaiting Parts) —
// those belong on Active Repair Orders.
const BILLING_TABS = ["All", "Ready To Invoice", "Awaiting Payment", "Ready For Release"];

export function BillingInvoicing() {
  // billingOrders is the single source of truth for this list.
  // ServiceAdvisorPage fetches + normalizes it.
  const { billingOrders, getBillingOrders, refreshOrders } = useOutletContext();

  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Refresh through the shared fetch when landing here.
  useEffect(() => {
    getBillingOrders();
  }, [getBillingOrders]);

  const orders = Array.isArray(billingOrders) ? billingOrders : [];
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null;

  // Redirect-and-open: Active Repair Orders' "Open Invoice →" button
  // (InvoicingStub in OrderStages.jsx) links here with ?order_id=<rawId>.
  useEffect(() => {
    const paramOrderId = searchParams.get("order_id");
    if (paramOrderId && orders.length > 0) {
      const match = orders.find((o) => String(o.rawId) === String(paramOrderId));
      if (match) {
        setSelectedOrderId(match.id);
      }
      setSearchParams({}, { replace: true });
    }
  }, [orders, searchParams, setSearchParams]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "All" || formatStatusLabel(order.status) === statusFilter;
      const matchesSearch =
        !q ||
        order.id.toLowerCase().includes(q) ||
        (order.customer && order.customer.toLowerCase().includes(q)) ||
        (order.vehicle && order.vehicle.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  // Generate invoice / payment change status across the dashboard, active
  // and billing lists, so refresh everything through the parent.
  async function handleUpdateOrder() {
    await refreshOrders();
  }

  return (
    <div className="w-full">
      <div className="sticky top-[73px] z-10 bg-card -mx-6 -mt-6 border-b border-border">
        <OrderFilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          placeholder="Search by order ID, customer, or vehicle..."
          tabs={BILLING_TABS}
        />
      </div>

      <div className="p-6 space-y-3">
        {filteredOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            isSelected={selectedOrderId === order.id}
            onClick={() => setSelectedOrderId(order.id)}
          />
        ))}

        {filteredOrders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            No billing records match your filters.
          </p>
        )}
      </div>

      <DetailDrawer
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
      >
        <InvoiceDetail
          order={selectedOrder}
          onUpdateOrder={handleUpdateOrder}
          onClose={() => setSelectedOrderId(null)}
        />
      </DetailDrawer>
    </div>
  );
}