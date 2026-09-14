"use client"

import { useState, useMemo } from "react";
import { OrderFilterBar } from "@/components/OrderSearchFilter";
import { OrderCard } from "@/components/OrderCard";
import { DetailDrawer } from "@/components/DetailDrawer";
import { RepairOrderDetail } from "@/components/RepairOrderDetail";
import { formatStatusLabel } from "@/utils/formatStatusLabel";

// Replace with your real data (fetch / props / server component data, etc.)
const INITIAL_ORDERS = [
  {
    id: "RO-1048",
    status: "PENDING_DIAGNOSIS",
    amount: "12000",
    customer: "Liam Johnson",
    vehicle: "Toyota Vios 2021",
    plate: "ABC-1234",
    vehicleType: "Car",
    date: "Aug 27, 2026",
    mechanics: null,
  },
  {
    id: "RO-1047",
    status: "IN_PROGRESS",
    customer: "Olivia Smith",
    vehicle: "Honda Click 125i",
    plate: "XYZ-5678",
    vehicleType: "Motorcycle",
    date: "Aug 26, 2026",
    mechanics: ["Ramon Cruz", "Diddle Steven"],
  },
  {
    id: "RO-1046",
    status: "PENDING_MECHANICS",
    customer: "Noah Williams",
    vehicle: "Yamaha Mio 2020",
    plate: "DEF-9012",
    vehicleType: "Motorcycle",
    date: "Aug 25, 2026",
    mechanics: null,
  },
];

export function ActiveRepairOrder() {
  // These two live here (the parent) because both the search box and the
  // status tabs inside OrderFilterBar need to share and update them.
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Real state now, not a static const — stage components need somewhere
  // to actually write status/mechanics/amount changes back to.
  const [orders, setOrders] = useState(INITIAL_ORDERS);

  // Track the selected order by id, not by holding a copy of the object.
  // The full order is derived from `orders` below, so it can never go
  // stale after a stage component updates it — there's exactly one
  // source of truth, not two copies that need to stay in sync.
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null;

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = statusFilter === "All" || formatStatusLabel(order.status) === statusFilter;
      const matchesSearch =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.customer.toLowerCase().includes(q) ||
        order.vehicle.toLowerCase().includes(q) ||
        order.plate.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  function handleUpdateOrder(orderId, updates) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o)));
  }

  return (
    <div className="w-full">
      {/* Full-bleed "second header": bg spans edge-to-edge regardless of
          how wide the parent layout is, search + filters live inside it. */}
      <div className="sticky top-[73px] z-10 bg-card -mx-6 -mt-6 border-b border-border">
        <OrderFilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>

      <div className="p-6 space-y-3">
        {filteredOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            isSelected={selectedOrderId === order.id}
            onClick={() => setSelectedOrderId(order.id)}
            onMenuClick={(clickedOrder) => {
              console.log("Kebab menu clicked for", clickedOrder.id);
            }}
          />
        ))}

        {filteredOrders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            No repair orders match your filters.
          </p>
        )}
      </div>

      <DetailDrawer
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
      >
        <RepairOrderDetail order={selectedOrder} onUpdateOrder={handleUpdateOrder} />
      </DetailDrawer>
    </div>
  );
}