"use client"

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useOutletContext } from "react-router";
import { DetailDrawer } from "@/components/DetailDrawer";
import { OrderCard } from "@/components/OrderCard";
import { MechanicOrderDetail } from "@/components/MechanicOrderDetail";
import { getMyPositionOnOrder } from "@/components/MechanicOrderStages";

// Orders where the viewer is the Diagnostician and diagnosis is still
// theirs to file or revise: not yet submitted (AWAITING_DIAGNOSIS), or
// submitted but mechanics haven't been assigned yet (PENDING_MECHANICS —
// DiagnosisFormStage's isUpdate path handles this, prefilled with the
// existing notes/services and an "Update Diagnosis" button). Once the
// order moves to IN_PROGRESS, the diagnosis is locked and the job drops
// off this list.
const VISIBLE_TO_DIAGNOSTIC_LOG_STATUSES = ["AWAITING_DIAGNOSIS", "PENDING_MECHANICS"];

export function DiagnosticLogs() {
  // tableData is the single source of truth for the mechanic's orders.
  // MechanicPage fetches + normalizes it (and builds each order's `team`),
  // so this page, Assigned Orders, and the sidebar badge never disagree.
  const { user, tableData, getTableData } = useOutletContext();
  const currentUserName = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim();

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Refresh through the shared fetch when landing here, so assignments or
  // status changes made elsewhere show up. Same state, no second copy.
  useEffect(() => {
    getTableData();
  }, [getTableData]);

  // Orders where I'm the Diagnostician and status is still open for
  // diagnosis. Derived from tableData (not filtered at fetch time) so
  // tableData stays the full set for the sidebar badge and other tabs.
  // Memoized so the redirect effect below doesn't re-run every render.
  const visibleOrders = useMemo(() => {
    const orders = Array.isArray(tableData) ? tableData : [];
    return orders.filter(
      (o) =>
        VISIBLE_TO_DIAGNOSTIC_LOG_STATUSES.includes(o.status) &&
        getMyPositionOnOrder(o, currentUserName) === "Diagnostician"
    );
  }, [tableData, currentUserName]);

  const selectedOrder = visibleOrders.find((o) => o.id === selectedOrderId) ?? null;

  // Redirect-and-open: Assigned Orders' "Open Diagnostic Log →" button
  // links here with ?order_id=<rawId>, same convention as the Dashboard
  // → Active Orders flow. Once the list has loaded, find the matching
  // row and open its drawer, then clear the param.
  useEffect(() => {
    const paramOrderId = searchParams.get("order_id");
    if (paramOrderId && visibleOrders.length > 0) {
      const match = visibleOrders.find((o) => String(o.rawId) === String(paramOrderId));
      if (match) {
        setSelectedOrderId(match.id);
      }
      setSearchParams({}, { replace: true });
    }
  }, [visibleOrders, searchParams, setSearchParams]);

  // DiagnosisFormStage POSTs submit-diagnosis itself, then calls this.
  // (The old body called setDiagnosticOrders / fetchDiagnosticOrders, which
  // no longer exist since tableData moved to MechanicPage.)
  function handleUpdateOrder() {
    getTableData();
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
          />
        ))}

        {visibleOrders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            No orders awaiting your diagnosis right now.
          </p>
        )}
      </div>

      <DetailDrawer
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
      >
        {/* allowDiagnosisForm defaults to true — this is the one page
            that's actually allowed to render the fill-in-diagnosis form. */}
        <MechanicOrderDetail
          order={selectedOrder}
          currentUserName={currentUserName}
          onUpdateOrder={handleUpdateOrder}
        />
      </DetailDrawer>
    </div>
  );
}