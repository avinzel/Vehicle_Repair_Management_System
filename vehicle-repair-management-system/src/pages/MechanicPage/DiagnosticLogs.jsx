"use client"

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { DetailDrawer } from "@/components/DetailDrawer";
import { OrderCard } from "@/components/OrderCard";
import { MechanicOrderDetail } from "@/components/MechanicOrderDetail";
import { getMyPositionOnOrder } from "@/components/MechanicOrderStages";

// TODO: placeholder mock data — same shape/contract as AssignedOrders'
// MOCK_ASSIGNED_ORDERS. Swap fetchDiagnosticOrders' body for a real call
// once a backend endpoint exists (likely the same underlying data source
// as Assigned Orders, just filtered differently — see filter below).
const MOCK_DIAGNOSTIC_ORDERS = [
  {
    id: "RO-1044",
    rawId: 1044,
    status: "AWAITING_DIAGNOSIS",
    statusLabel: "Awaiting Diagnosis",
    customer: "James Davis",
    vehicle: "Kawasaki Barako 175",
    plate: "JKL-7890",
    vehicleType: "Motorcycle",
    date: "Aug 23, 2026",
    complaint: "Engine makes a rattling noise when idling and loses power going uphill.",
    diagnosticNotes: null,
    requiredServices: [],
    team: [{ id: "u2", name: "Ben Reyes", role: "Diagnostician" }],
    partsLogged: [],
  },
  {
    id: "RO-1041",
    rawId: 1041,
    status: "PENDING_MECHANICS",
    statusLabel: "Pending Mechanics",
    customer: "Maria Lopez",
    vehicle: "Suzuki Raider 150",
    plate: "MNO-2233",
    vehicleType: "Motorcycle",
    date: "Aug 22, 2026",
    complaint: "Chain feels loose and makes noise on rough roads. Front brake feels soft.",
    diagnosticNotes:
      "Chain slack beyond spec, sprocket teeth showing wear. Front brake lever has excessive play. Recommend chain and sprocket set replacement, front brake adjustment and fluid check.",
    requiredServices: ["Chain & Sprocket Service"],
    team: [{ id: "u2", name: "Ben Reyes", role: "Diagnostician" }],
    partsLogged: [],
  },
];

// Orders where the viewer is the Diagnostician and diagnosis is still
// theirs to file or revise: not yet submitted (AWAITING_DIAGNOSIS), or
// submitted but mechanics haven't been assigned yet (PENDING_MECHANICS —
// DiagnosisFormStage's isUpdate path handles this, prefilled with the
// existing notes/services and an "Update Diagnosis" button). Once the
// order moves to IN_PROGRESS, the diagnosis is locked and the job drops
// off this list.
const VISIBLE_TO_DIAGNOSTIC_LOG_STATUSES = ["AWAITING_DIAGNOSIS", "PENDING_MECHANICS"];

export function DiagnosticLogs({ currentUserName = "Ben Reyes" }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [diagnosticOrders, setDiagnosticOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const fetchDiagnosticOrders = useCallback(async () => {
    // TODO: backend not built yet. Replace with a real fetch, same
    // pattern as AssignedOrders.fetchAssignedOrders.
    setDiagnosticOrders(MOCK_DIAGNOSTIC_ORDERS);
  }, []);

  useEffect(() => {
    fetchDiagnosticOrders();
  }, [fetchDiagnosticOrders]);

  // Orders where I'm the Diagnostician and status is still open for
  // diagnosis. Kept as a derived list (not filtered at fetch time) for
  // the same reason as AssignedOrders' visibleOrders.
  const visibleOrders = diagnosticOrders.filter(
    (o) =>
      VISIBLE_TO_DIAGNOSTIC_LOG_STATUSES.includes(o.status) &&
      getMyPositionOnOrder(o, currentUserName) === "Diagnostician"
  );

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

  function handleUpdateOrder(orderId, updates) {
    // TODO: backend not built yet — this only updates local state so the
    // UI reflects the change. Replace with a real POST/PUT once the
    // endpoint exists, then re-fetch (same pattern as AssignedOrders).
    setDiagnosticOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o))
    );
    // Submitting a diagnosis moves status to PENDING_MECHANICS, which
    // falls out of visibleOrders automatically on next render — no extra
    // logic needed to make the card disappear from this list.
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