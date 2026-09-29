"use client"

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { OrderFilterBar } from "@/components/OrderSearchFilter";
import { OrderCard } from "@/components/OrderCard";
import { DetailDrawer } from "@/components/DetailDrawer";
import { InvoiceDetail } from "@/components/InvoiceDetail";
import { formatStatusLabel } from "@/utils/formatStatusLabel";
import { normalizeOrder } from "@/utils/normalizeOrder";

// This page covers the financial tail of the pipeline — everything from
// "repair done, needs invoicing" through "paid and released", plus the
// historical Fulfilled orders for reference. It deliberately does NOT
// include earlier statuses (Pending Diagnosis through Awaiting Parts) —
// those belong on Active Repair Orders.
const BILLING_TABS = ["All", "Ready to Invoice", "Awaiting Payment", "Ready for Release", "Fulfilled"];

// TODO: placeholder mock data. laborCharges/partsCharges/team are needed
// by InvoiceDetail's breakdown and roster sections — once wired to a real
// endpoint, these need to come from the invoice + repair_order_mechanics
// join, not just the bare order record.
const MOCK_BILLING_ORDERS = [
  {
    id: "RO-1045",
    rawId: 1045,
    status: "AWAITING_PAYMENT",
    customer: "Emma Brown",
    vehicle: "Toyota Vios 2019",
    plate_number: "GHI-3456",
    vehicleType: "Car",
    date: "Aug 24, 2026",
    amount: 6800,
    laborCharges: 4080,
    partsCharges: 2720,
    team: [
      { id: "u2", name: "Ben Reyes", role: "Lead Mechanic" },
      { id: "u3", name: "Leo Santos", role: "Assistant" },
      { id: "u4", name: "Carlo Bautista", role: "Electrical Specialist" },
    ],
  },
  {
    id: "RO-1043",
    rawId: 1043,
    status: "FULFILLED",
    customer: "Sophia Garcia",
    vehicle: "Honda Tricycle",
    plate_number: "TRI-1122",
    vehicleType: "Tricycle",
    date: "Aug 22, 2026",
    amount: 1500,
    laborCharges: 1000,
    partsCharges: 500,
    paymentMethod: "GCash",
    team: [{ id: "u2", name: "Ben Reyes", role: "Lead Mechanic" }],
  },
  {
    id: "RO-1042",
    rawId: 1042,
    status: "FULFILLED",
    customer: "Carlos Reyes",
    vehicle: "Mitsubishi Mirage 2020",
    plate_number: "MIR-5566",
    vehicleType: "Car",
    date: "Aug 21, 2026",
    amount: 9500,
    laborCharges: 6000,
    partsCharges: 3500,
    paymentMethod: "Cash",
    team: [
      { id: "u2", name: "Ben Reyes", role: "Lead Mechanic" },
      { id: "u3", name: "Leo Santos", role: "Assistant" },
    ],
  },
];

export function BillingInvoicing() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const fetchBillingOrders = useCallback(async () => {
    // TODO: backend not built yet, but the route already exists —
    // api.php's "repair-orders" action already dispatches
    // category=inactive to InvoiceController::getBillingAndInvoicingRecords(),
    // it just isn't implemented on the backend side yet:
    try {
      const response = await fetch(
      `http://localhost:8000/api.php?action=invoices`,
      { credentials: 'include' }
      );
      const json = await response.json();
      if (json.status === "success") {
        setOrders(json.data.map(normalizeOrder));
      } else {
        console.error("Failed to fetch active orders:", json.error);
      }
    } catch (err) {
      console.error("Failed to fetch active orders:", err);
    }
  }, []);

  useEffect(() => {
    fetchBillingOrders();
  }, [fetchBillingOrders]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null;

  // Redirect-and-open: Active Repair Orders' "Open Invoice →" button
  // (InvoicingStub in OrderStages.jsx) links here with ?order_id=<rawId>,
  // same convention as the Dashboard → Active Orders and Assigned Orders
  // → Diagnostic Log / Parts Logger flows.
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

  function handleUpdateOrder(orderId, updates) {
    // TODO: backend not built yet — this only updates local state so the
    // UI reflects the change. Replace with a real call once the
    // corresponding post-methods (mark-ready-to-invoice, payment, etc.)
    // are wired up, then re-fetch (same pattern as the other pages).
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o)));
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