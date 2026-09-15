"use client"

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { OrderFilterBar } from "@/components/OrderSearchFilter";
import { OrderCard } from "@/components/OrderCard";
import { DetailDrawer } from "@/components/DetailDrawer";
import { RepairOrderDetail } from "@/components/RepairOrderDetail";
import { formatStatusLabel } from "@/utils/formatStatusLabel";
import { normalizeOrder } from "@/utils/normalizeOrder";

// Merge helper: detail-endpoint data overwrites list-row data field by
// field, but never with null/undefined — so a field the detail response
// doesn't include (or hasn't loaded yet) doesn't wipe out a good value
// already present from the list.
function mergeOrder(base, overrides) {
  if (!overrides) return base;
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== null && value !== undefined) merged[key] = value;
  }
  return merged;
}

export function ActiveRepairOrder() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeOrders, setActiveOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const [orderDetails, setOrderDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // This page now owns its own fetch — it no longer reuses the
  // dashboard's tableData (sp_populate_dashboard_table), since that
  // procedure has no status/search filtering and is missing raw_order_id,
  // plate_number, vehicle_type, and formatted_date. sp_get_active_repair_orders
  // already returns all of that.
  const fetchActiveOrders = useCallback(async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/api.php?action=repair-orders&category=active`,
        { credentials: 'include' }
      );
      const json = await response.json();
      if (json.status === "success") {
        setActiveOrders(json.data.map(normalizeOrder));
      } else {
        console.error("Failed to fetch active orders:", json.error);
      }
    } catch (err) {
      console.error("Failed to fetch active orders", err);
    }
  }, []);

  useEffect(() => {
    fetchActiveOrders();
  }, [fetchActiveOrders]);

  // Sorted list, newest first — reads rawId directly now, no more
  // regex-stripping "RO-7" to get a number.
  const sortedOrders = useMemo(() => {
    return [...activeOrders].sort((a, b) => (b.rawId ?? 0) - (a.rawId ?? 0));
  }, [activeOrders]);

  const selectedListOrder = sortedOrders.find((o) => o.id === selectedOrderId) ?? null;

  const selectedOrder = selectedListOrder ? mergeOrder(selectedListOrder, orderDetails) : null;


  const fetchOrderDetails = useCallback(async (rawOrderId) => {
    setDetailsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api.php?action=repair-orders&category=active&order_id=${encodeURIComponent(rawOrderId)}`,
        { credentials: 'include' }
      );
      const json = await response.json();
      if (json.status === "success") {
        setOrderDetails(normalizeOrder(json.data));
      } else {
        console.error("Order details request failed:", json.error ?? json.message);
      }
    } catch (err) {
      console.error("Failed to fetch order details", err);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedOrderId) {
      setOrderDetails(null);
      return;
    }
    const rawId = selectedListOrder?.rawId;
    if (rawId == null) return; // list row not loaded yet, wait for it
    setOrderDetails(null);
    fetchOrderDetails(rawId);
  }, [selectedOrderId, selectedListOrder?.rawId, fetchOrderDetails]);

  // Redirect-and-open: Dashboard quick actions link here with
  // ?order_id=<rawId>. Once the list has loaded, find the matching
  // row and open its drawer, then clear the param.
  useEffect(() => {
    const paramOrderId = searchParams.get("order_id");
    if (paramOrderId && sortedOrders.length > 0) {
      const match = sortedOrders.find((o) => String(o.rawId) === String(paramOrderId));
      if (match) {
        setSelectedOrderId(match.id);
      }
      setSearchParams({}, { replace: true });
    }
  }, [sortedOrders, searchParams, setSearchParams]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sortedOrders.filter((order) => {
      const matchesStatus = statusFilter === "All" || formatStatusLabel(order.status) === statusFilter;
      const matchesSearch =
        !q ||
        order.id.toLowerCase().includes(q) ||
        (order.customer && order.customer.toLowerCase().includes(q)) ||
        (order.vehicle && order.vehicle.toLowerCase().includes(q)) ||
        (order.plateNumber && order.plateNumber.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [sortedOrders, search, statusFilter]);

  function handleUpdateOrder(orderId, updates) {
    fetchActiveOrders();
    if (orderId === selectedOrderId && selectedListOrder?.rawId != null) {
      fetchOrderDetails(selectedListOrder.rawId);
    }
  }

  return (
    <div className="w-full">
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
        <RepairOrderDetail order={selectedOrder} onUpdateOrder={handleUpdateOrder} detailsLoading={detailsLoading} />
      </DetailDrawer>
    </div>
  );
}