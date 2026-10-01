"use client"

import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { DetailDrawer } from "@/components/DetailDrawer";
import { OrderCard } from "@/components/OrderCard";
import { MechanicOrderDetail } from "@/components/MechanicOrderDetail";
import { getMyPositionOnOrder } from "@/components/MechanicOrderStages";

// Statuses a mechanic actually has something to do at. Everything past
// IN_PROGRESS is advisor/billing territory (invoicing, payment, release)
// — showing those here would just be noise a mechanic can't act on.
// Keep in sync with ACTIONABLE_STATUSES in MechanicPage.jsx (drives the
// sidebar badge count).
// NOTE: matches the DB enum's AWAITING_PARTS. OrderStages.jsx's STATUS
// constant currently has this as PENDING_PARTS instead — that's a
// pre-existing mismatch on the advisor side, not something introduced
// here; flagging it since this filter is the thing that would silently
// break if it drifted further.
const VISIBLE_TO_MECHANIC_STATUSES = ["AWAITING_DIAGNOSIS", "PENDING_MECHANICS", "IN_PROGRESS", "AWAITING_PARTS"];

export function AssignedOrders() {
  // tableData is the single source of truth for the mechanic's assigned
  // orders. MechanicPage fetches + normalizes it (and builds each order's
  // `team`), so the sidebar badge and this list can never disagree.
  const { user, tableData, getTableData } = useOutletContext();
  const currentUserName = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim();

  const navigate = useNavigate();
  const [selectedOrderId, setSelectedOrderId] = useState(null);

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

  // Resolved from the visible list (not the full set) so that when an
  // order leaves the actionable statuses — e.g. after Mark Job Complete
  // moves it to READY_TO_INVOICE — its drawer closes on its own.
  const selectedOrder = visibleOrders.find((o) => o.id === selectedOrderId) ?? null;

  // The stage components call their own endpoints (e.g. mark-ready-to-invoice)
  // and then report back here; this just re-syncs the shared state from the
  // server instead of patching it locally.
  function handleUpdateOrder() {
    getTableData();
  }

  function handleLogParts(orderId) {
    const order = assignedOrders.find((o) => o.id === orderId);
    const rawId = order?.rawId ?? orderId;
    navigate(`/mechanic/part-logger?order_id=${encodeURIComponent(rawId)}`);
  }

  // Assigned Orders never hosts the editable diagnosis form — that's
  // Diagnostic Log's job. When the Diagnostician here has no notes filed
  // yet, RepairTeamStage shows a prompt that calls this instead.
  function handleOpenDiagnosticLog(orderId) {
    const order = assignedOrders.find((o) => o.id === orderId);
    const rawId = order?.rawId ?? orderId;
    navigate(`/mechanic/diagnostic-log?order_id=${encodeURIComponent(rawId)}`);
  }

  function partsSummary(order) {
    const count = order.partsLogged?.length ?? 0;
    const mechanicCount = order.team?.length ?? 0;
    if (count === 0 && mechanicCount === 0) return null;
    return `${count} part${count === 1 ? "" : "s"} logged · ${mechanicCount} mechanic${mechanicCount === 1 ? "" : "s"} on job`;
  }

  return (
    <div className="w-full">
      <div className="px-6 space-y-3">
        {visibleOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            isSelected={selectedOrderId === order.id}
            onClick={() => setSelectedOrderId(order.id)}
            roleBadge={getMyPositionOnOrder(order, currentUserName)}
            notesPreview={order.diagnosticNotes}
            footerNote={partsSummary(order)}
          />
        ))}

        {visibleOrders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            No orders assigned to you right now.
          </p>
        )}
      </div>

      <DetailDrawer
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
      >
        <MechanicOrderDetail
          order={selectedOrder}
          currentUserName={currentUserName}
          onUpdateOrder={handleUpdateOrder}
          onLogParts={handleLogParts}
          allowDiagnosisForm={false}
          onOpenDiagnosticLog={handleOpenDiagnosticLog}
        />
      </DetailDrawer>
    </div>
  );
}