"use client"

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { DetailDrawer } from "@/components/DetailDrawer";
import { OrderCard } from "@/components/OrderCard";
import { MechanicOrderDetail } from "@/components/MechanicOrderDetail";
import { getMyPositionOnOrder } from "@/components/MechanicOrderStages";

// Statuses a mechanic actually has something to do at. Everything past
// IN_PROGRESS is advisor/billing territory (invoicing, payment, release)
// — showing those here would just be noise a mechanic can't act on.
// NOTE: matches the DB enum's AWAITING_PARTS. OrderStages.jsx's STATUS
// constant currently has this as PENDING_PARTS instead — that's a
// pre-existing mismatch on the advisor side, not something introduced
// here; flagging it since this filter is the thing that would silently
// break if it drifted further.
const VISIBLE_TO_MECHANIC_STATUSES = ["AWAITING_DIAGNOSIS", "PENDING_MECHANICS", "IN_PROGRESS", "AWAITING_PARTS"];

// TODO: placeholder mock data, shaped like what a future
// RepairOrderController::getAssignedOrders() should return once that
// action exists in api.php. Swap fetchAssignedOrders' body for a real
// call once the backend endpoint is built — the shape below (team/
// partsLogged) is the contract MechanicOrderStages expects.
//
// Note there is no top-level "role" field on these orders anymore — under
// dynamic positioning, a mechanic's role is only meaningful per order, so
// it lives solely in each order's own `team` array and is looked up via
// getMyPositionOnOrder. "Ben Reyes" (the mock viewer below) deliberately
// holds different roles across these three orders to exercise that.
const MOCK_ASSIGNED_ORDERS = [
  {
    id: "RO-1050",
    rawId: 1050,
    status: "IN_PROGRESS",
    statusLabel: "In Progress",
    customer: "Grace Tan",
    vehicle: "Honda Civic 2022",
    plate: "STU-3344",
    vinNumber: "1FVAC4DV6MH593254",
    vehicleType: "Car",
    date: "Aug 25, 2026",
    diagnosticNotes:
      "Customer reports engine misfiring at idle and occasional stalling. Initial inspection shows fouled spark plugs and clogged air filter. Recommend full tune-up and fuel system cleaning.",
    team: [
      { id: "u1", name: "Ramon Cruz", role: "Diagnostician" },
      { id: "u2", name: "Ben Reyes", role: "Lead Mechanic" },
      { id: "u3", name: "Leo Santos", role: "Assistant" },
    ],
    partsLogged: [{ name: "Air Filter", loggedBy: "Ben Reyes", qty: 1, cost: 380 }],
  },
  {
    id: "RO-1045",
    rawId: 1045,
    status: "AWAITING_PAYMENT",
    statusLabel: "Awaiting Payment",
    customer: "Emma Brown",
    vehicle: "Toyota Vios 2019",
    vinNumber: "1G1JE1112H7212753",
    plate: "GHI-3456",
    vehicleType: "Car",
    date: "Aug 24, 2026",
    diagnosticNotes:
      "Vehicle will not start. Battery voltage reads 9.2V (dead). Alternator output within spec. Starter motor draws excessive current — likely worn brushes. Recommend battery replacement and starter motor overhaul.",
    team: [
      { id: "u2", name: "Ben Reyes", role: "Assistant" },
      { id: "u3", name: "Leo Santos", role: "Lead Mechanic" },
    ],
    partsLogged: [
      { name: "Battery", loggedBy: "Leo Santos", qty: 1, cost: 3200 },
      { name: "Starter Motor", loggedBy: "Leo Santos", qty: 1, cost: 2800 },
    ],
  },
  {
    id: "RO-1044",
    rawId: 1044,
    status: "AWAITING_DIAGNOSIS",
    statusLabel: "Awaiting Diagnosis",
    customer: "James Davis",
    vehicle: "Kawasaki Barako 175",
    vinNumber: "JKBAFSE13NB503104",
    plate: "JKL-7890",
    vehicleType: "Motorcycle",
    date: "Aug 23, 2026",
    diagnosticNotes: null,
    requiredServices: [],
    team: [{ id: "u2", name: "Ben Reyes", role: "Diagnostician" }],
    partsLogged: [],
  },
];

export function AssignedOrders({ currentUserName = "Ben Reyes" }) {
  const navigate = useNavigate();
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const fetchAssignedOrders = useCallback(async () => {
    // TODO: backend not built yet. Replace with:
    // const response = await fetch(
    //   `http://localhost:8000/api.php?action=repair-orders&category=assigned`,
    //   { credentials: 'include' }
    // );
    // const json = await response.json();
    // if (json.status === "success") setAssignedOrders(json.data.map(normalizeOrder));
    setAssignedOrders(MOCK_ASSIGNED_ORDERS);
  }, []);

  useEffect(() => {
    fetchAssignedOrders();
  }, [fetchAssignedOrders]);

  const selectedOrder = assignedOrders.find((o) => o.id === selectedOrderId) ?? null;

  // Only the stages a mechanic can act on. Kept as a derived list rather
  // than filtering the fetch itself, so assignedOrders stays the full set
  // in case something else (e.g. a sidebar badge count) needs the total.
  const visibleOrders = assignedOrders.filter((o) => VISIBLE_TO_MECHANIC_STATUSES.includes(o.status));

  function handleUpdateOrder(orderId, updates) {
    // TODO: backend not built yet — this only updates local state so the
    // UI reflects the change. Replace with a POST/PUT to the real
    // endpoint once it exists, then re-fetch (same pattern as
    // ActiveRepairOrder.handleUpdateOrder).
    setAssignedOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o))
    );
  }

  function handleLogParts(orderId) {
    // TODO: wire to a real "log parts" flow once that page/endpoint exists.
    console.log("Log parts for", orderId);
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