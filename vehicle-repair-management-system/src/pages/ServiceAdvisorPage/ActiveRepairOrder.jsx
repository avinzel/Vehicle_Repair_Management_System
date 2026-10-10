"use client"

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useOutletContext } from "react-router";
import { OrderFilterBar } from "@/components/OrderSearchFilter";
import { OrderCard } from "@/components/OrderCard";
import { DetailDrawer } from "@/components/DetailDrawer";
import { RepairOrderDetail } from "@/components/RepairOrderDetail";
import { RepairOrderFormDialog } from "@/components/dialogs/RepairOrderFormDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatStatusLabel } from "@/utils/formatStatusLabel";
import { normalizeOrderDetail } from "@/utils/normalizeOrder";

const API = "http://localhost:8000/api.php";

async function request(url, options) {
  const res = await fetch(url, { credentials: "include", ...options });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json.status && json.status !== "success")) {
    throw new Error(json.error ?? json.message ?? `Request failed (HTTP ${res.status})`);
  }
  return json;
}

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
  // activeOrders is the single source of truth for this list.
  // ServiceAdvisorPage fetches + normalizes it, so the sidebar badge and
  // this page can never disagree.
  const { activeOrders, getActiveOrders, refreshOrders } = useOutletContext();

  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const [orderDetails, setOrderDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Dialog state lives here (page level), not inside the drawer, so the
  // dialogs aren't nested in the Sheet and get their own backdrop/blur.
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  // Refresh through the shared fetch when landing here, so changes made on
  // other tabs show up. Same state, no second copy.
  useEffect(() => {
    getActiveOrders();
  }, [getActiveOrders]);

  // Sorted list, newest first.
  const sortedOrders = useMemo(() => {
    const orders = Array.isArray(activeOrders) ? activeOrders : [];
    return [...orders].sort((a, b) => (b.rawId ?? 0) - (a.rawId ?? 0));
  }, [activeOrders]);

  const selectedListOrder = sortedOrders.find((o) => o.id === selectedOrderId) ?? null;
  const selectedOrder = selectedListOrder ? mergeOrder(selectedListOrder, orderDetails) : null;

  // Per-selection detail fetch stays local: it's on-demand for one order,
  // not data the parent holds.
  const fetchOrderDetails = useCallback(async (rawOrderId) => {
    setDetailsLoading(true);
    try {
      const response = await fetch(
        `${API}?action=repair-orders&category=active&order_id=${encodeURIComponent(rawOrderId)}`,
        { credentials: 'include' }
      );
      const json = await response.json();
      if (json.status === "success") {
        setOrderDetails(normalizeOrderDetail(json.data));
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

  // Redirect-and-open: ?order_id=<rawId>. Once the list has loaded, find
  // the matching row and open its drawer, then clear the param.
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

  // A status change affects the dashboard cards/table, this list, and the
  // billing list, so refresh everything through the parent, then re-pull
  // the open order's details.
  async function handleUpdateOrder(orderId) {
    await refreshOrders();
    if (orderId === selectedOrderId && selectedListOrder?.rawId != null) {
      fetchOrderDetails(selectedListOrder.rawId);
    }
  }

  async function handleEditSubmit(changes) {
    await request(`${API}?action=repair-orders&put-method=update-order`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id: selectedOrder.rawId, ...changes }),
    });
    await handleUpdateOrder(selectedOrder.id); // refetch lists + this order's details
  }

  async function handleCancelConfirm() {
    setCancelling(true);
    setCancelError(null);
    try {
      await request(`${API}?action=repair-orders&order_id=${encodeURIComponent(selectedOrder.rawId)}`, {
        method: "DELETE",
      });
      setCancelOpen(false);
      // Order drops off the active list, so selectedOrder becomes null and the drawer closes.
      await handleUpdateOrder(selectedOrder.id);
    } catch (err) {
      setCancelError(err.message || "Failed to cancel the order.");
    } finally {
      setCancelling(false);
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
              console.log("Order card clicked for", clickedOrder.id);
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
          if (open) return;
          // The dialogs are portaled outside the drawer, so the drawer sees
          // clicks inside them as "outside" presses and asks to close.
          // Ignore that while a dialog is open; the dialog handles its own dismissal.
          if (editOpen || cancelOpen) return;
          setSelectedOrderId(null);
        }}
      >
        <RepairOrderDetail
          order={selectedOrder}
          onUpdateOrder={handleUpdateOrder}
          detailsLoading={detailsLoading}
          onEditClick={() => setEditOpen(true)}
          onCancelClick={() => {
            setCancelError(null);
            setCancelOpen(true);
          }}
        />
      </DetailDrawer>

      {/* Siblings of the drawer, not children, so they aren't "nested". */}
      {selectedOrder && (
        <>
          <RepairOrderFormDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            order={selectedOrder}
            onSubmit={handleEditSubmit}
          />
          <ConfirmDialog
            open={cancelOpen}
            onOpenChange={(next) => !cancelling && setCancelOpen(next)}
            title={`Cancel ${selectedOrder.id}?`}
            description="Parts already issued to this order will be returned to inventory. This can't be undone."
            confirmLabel="Cancel order"
            destructive
            loading={cancelling}
            error={cancelError}
            onConfirm={handleCancelConfirm}
          />
        </>
      )}
    </div>
  );
}