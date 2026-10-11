"use client"

import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { DetailDrawer } from "@/components/DetailDrawer";
import { OrderCard } from "@/components/OrderCard";
import { MechanicOrderDetail } from "@/components/MechanicOrderDetail";
import { getMyPositionOnOrder } from "@/components/MechanicOrderStages";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { OrderFilterBar, matchesSearch } from "@/components/OrderSearchFilter";
import { formatStatusLabel } from "@/utils/formatStatusLabel";
import { normalizeOrderDetail, normalizeLoggedPart } from "@/utils/normalizeOrder";

const API = "http://localhost:8000/api.php";

// Statuses a mechanic actually has something to do at. Everything past
// IN_PROGRESS is advisor/billing territory (invoicing, payment, release)
// — showing those here would just be noise a mechanic can't act on.
// Keep in sync with ACTIONABLE_STATUSES in MechanicPage.jsx (drives the
// sidebar badge count).
const VISIBLE_TO_MECHANIC_STATUSES = ["AWAITING_DIAGNOSIS", "PENDING_MECHANICS", "IN_PROGRESS", "AWAITING_PARTS"];

// Filter pills — only the statuses a mechanic can actually see here.
const TABS = ["All", "Awaiting Diagnosis", "Pending Mechanics", "In Progress", "Awaiting Parts"];

export function AssignedOrders() {
  // tableData is the single source of truth for the mechanic's assigned
  // orders. MechanicPage fetches + normalizes it. sp_get_mechanic_work_orders
  // only returns the viewer's own position plus COUNTS of parts/mechanics,
  // so the full crew and parts list are loaded per order below.
  const { user, tableData, getTableData } = useOutletContext();
  const currentUserName = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim();

  const navigate = useNavigate();
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Full crew + non-cancelled parts for the open order:
  // { rawId, team, partsLogged }
  const [extra, setExtra] = useState(null);

  const [completeOrderId, setCompleteOrderId] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Refresh through the shared fetch when landing here, so parts logged or
  // a diagnosis filed on another tab show up. Same state, no second copy.
  useEffect(() => {
    getTableData();
  }, [getTableData]);

  const assignedOrders = Array.isArray(tableData) ? tableData : [];

  // Only the stages a mechanic can act on. Kept as a derived list rather
  // than filtering the fetch itself, so tableData stays the full set for
  // the sidebar badge and any other consumer.
  const visibleOrders = assignedOrders.filter((o) => VISIBLE_TO_MECHANIC_STATUSES.includes(o.status));

  // Search + status pill filter, applied on top of the actionable list.
  const filteredOrders = visibleOrders.filter(
    (o) =>
      (statusFilter === "All" || formatStatusLabel(o.status) === statusFilter) &&
      matchesSearch(search, o.id, o.customer, o.vehicle, o.plateNumber, o.diagnosticNotes)
  );

  // Resolved from the visible list (not the filtered one) so typing in the
  // search box doesn't close an open drawer, and so the drawer closes on its
  // own when the order leaves the actionable statuses.
  const baseSelected = visibleOrders.find((o) => o.id === selectedOrderId) ?? null;

  // Reload the crew/parts when a different order opens, or when something
  // the list already tracks changes (status, part count, mechanic count).
  const selectedRawId = baseSelected?.rawId ?? null;
  const selectedStatus = baseSelected?.status;
  const selectedPartsCount = baseSelected?.partsLoggedCount;
  const selectedMechanicsCount = baseSelected?.totalMechanicsCount;

  useEffect(() => {
    if (selectedRawId == null) {
      setExtra(null);
      return;
    }
    let cancelled = false;
    const id = encodeURIComponent(selectedRawId);

    Promise.all([
      // sp_get_repair_order_details -> full crew with positions
      fetch(`${API}?action=repair-orders&category=active&order_id=${id}`, { credentials: "include" }).then((r) =>
        r.json()
      ),
      // sp_get_parts_by_repair_order -> non-cancelled parts only
      fetch(`${API}?action=repair-orders&category=parts-by-order&order_id=${id}`, { credentials: "include" }).then(
        (r) => r.json()
      ),
    ])
      .then(([detailJson, partsJson]) => {
        if (cancelled) return;

        const detail =
          detailJson.status === "success" && detailJson.data ? normalizeOrderDetail(detailJson.data) : null;

        // RepairTeamStage reads part.name / part.qty / part.cost.
        const parts = Array.isArray(partsJson.data)
          ? partsJson.data.map(normalizeLoggedPart).map((p) => ({
              id: p.order_part_id,
              name: p.part_name,
              qty: p.quantity_used,
              cost: p.unit_price,
              status: p.status,
            }))
          : null;

        setExtra({ rawId: selectedRawId, team: detail?.team ?? null, partsLogged: parts });
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to load crew/parts for order", selectedRawId, err);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRawId, selectedStatus, selectedPartsCount, selectedMechanicsCount]);

  // Overlay the full crew/parts onto the list row. Until they load (or if a
  // request fails) the drawer falls back to the list row's own values.
  const selectedOrder = baseSelected
    ? {
        ...baseSelected,
        ...(extra?.rawId === baseSelected.rawId
          ? {
              team: extra.team?.length ? extra.team : baseSelected.team,
              partsLogged: extra.partsLogged ?? baseSelected.partsLogged,
            }
          : {}),
      }
    : null;

  function requestComplete(orderId) {
    setCompleteError(null);
    setCompleteOrderId(orderId);
  }

  // POST action=repair-orders&post-method=mark-ready-to-invoice
  // -> sp_mark_ready_to_invoice (rejects while any part is PENDING_PARTS).
  async function handleMarkComplete() {
    const order = assignedOrders.find((o) => o.id === completeOrderId);
    if (!order) return;

    setCompleting(true);
    setCompleteError(null);
    try {
      const response = await fetch(`${API}?action=repair-orders&post-method=mark-ready-to-invoice`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: Number(order.rawId ?? order.id) }),
      });
      const json = await response.json().catch(() => ({}));

      if (!response.ok || (json.status && json.status !== "success")) {
        throw new Error(json.error ?? json.message ?? `Request failed (HTTP ${response.status})`);
      }

      setCompleteOrderId(null);
      getTableData(); // order leaves the actionable list, which also closes the drawer
    } catch (err) {
      console.error("Failed to mark job complete:", err);
      setCompleteError(err.message || "Something went wrong. Please try again.");
    } finally {
      setCompleting(false);
    }
  }

  // The stage components call their own endpoints and then report back
  // here; this just re-syncs the shared state from the server.
  function handleUpdateOrder() {
    getTableData();
  }

  function handleLogParts(orderId) {
    const order = assignedOrders.find((o) => o.id === orderId);
    const rawId = order?.rawId ?? orderId;
    navigate(`/mechanic/part-logger?order_id=${encodeURIComponent(rawId)}`);
  }

  // Assigned Orders never hosts the editable diagnosis form — that's
  // Diagnostic Log's job.
  function handleOpenDiagnosticLog(orderId) {
    const order = assignedOrders.find((o) => o.id === orderId);
    const rawId = order?.rawId ?? orderId;
    navigate(`/mechanic/diagnostic-log?order_id=${encodeURIComponent(rawId)}`);
  }

  // Counts come straight from the SP (normalizeMechanicWorkOrder camelCases them).
  function footerNote(order) {
    const parts = order.partsLoggedCount ?? 0;
    const mechanics = order.totalMechanicsCount ?? order.team?.length ?? 0;
    return `${parts} part${parts === 1 ? "" : "s"} logged · ${mechanics} mechanic${mechanics === 1 ? "" : "s"} on job`;
  }

  return (
    <div className="w-full">
      {/* Full-bleed sticky filter bar, same treatment as Active Repair Orders. */}
      <div className="sticky top-[73px] z-10 bg-card -mx-6 -mt-6 border-b border-border">
        <OrderFilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          placeholder="Search by order ID, customer, or vehicle..."
          tabs={TABS}
        />
      </div>

      <div className="p-6 space-y-3">
        {filteredOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            isSelected={selectedOrderId === order.id}
            onClick={() => setSelectedOrderId(order.id)}
            roleBadge={getMyPositionOnOrder(order, currentUserName)}
            notesPreview={order.diagnosticNotes}
            footerNote={footerNote(order)}
          />
        ))}

        {filteredOrders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            {visibleOrders.length === 0
              ? "No orders assigned to you right now."
              : "No orders match your filters."}
          </p>
        )}
      </div>

      <DetailDrawer
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (open) return;
          // The confirm dialog is portaled outside the drawer, so clicks
          // inside it look like outside presses to the drawer. Ignore
          // those while it's open.
          if (completeOrderId !== null) return;
          setSelectedOrderId(null);
        }}
      >
        <MechanicOrderDetail
          order={selectedOrder}
          currentUserName={currentUserName}
          onUpdateOrder={handleUpdateOrder}
          onLogParts={handleLogParts}
          allowDiagnosisForm={false}
          onOpenDiagnosticLog={handleOpenDiagnosticLog}
          onRequestComplete={requestComplete}
        />
      </DetailDrawer>

      <ConfirmDialog
        open={completeOrderId !== null}
        onOpenChange={(open) => {
          if (!open && !completing) {
            setCompleteOrderId(null);
            setCompleteError(null);
          }
        }}
        title="Mark job complete?"
        description="Hand this job over for billing? It leaves your list and can't be moved back to In Progress from here."
        confirmLabel="Confirm"
        loading={completing}
        error={completeError}
        onConfirm={handleMarkComplete}
      />
    </div>
  );
}