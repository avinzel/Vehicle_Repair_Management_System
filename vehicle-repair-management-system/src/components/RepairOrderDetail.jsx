"use client"

import { X, Pencil, Ban } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { SheetClose } from "@/components/ui/sheet";
import { formatStatusLabel } from "@/utils/formatStatusLabel";
import { ORDER_STAGES } from "@/components/OrderStages";

// Backend only allows cancelling before READY_TO_INVOICE.
export const CANCELLABLE = [
  "PENDING_DIAGNOSIS",
  "AWAITING_DIAGNOSIS",
  "PENDING_MECHANICS",
  "IN_PROGRESS",
  "AWAITING_PARTS",
];

// The Customer & Vehicle block and the header stay constant across every
// status. The stage section in the middle is the only part that actually
// changes shape as the order moves through the pipeline.
//
// The edit and cancel dialogs are NOT rendered here. They live in
// ActiveRepairOrder as siblings of the drawer, so they aren't nested
// inside the Sheet (nested dialogs lose their backdrop/blur).
export function RepairOrderDetail({ order, onUpdateOrder, detailsLoading, onEditClick, onCancelClick }) {
  if (!order) return null;

  const statusLabel = formatStatusLabel(order.status);
  const StageComponent = ORDER_STAGES[statusLabel];
  const canCancel = CANCELLABLE.includes(order.status);
  // complaint only comes back from the detail endpoint, so wait for it before editing
  const canEdit = !detailsLoading && order.complaint != null && order.status !== "CANCELLED";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between p-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{order.id}</h2>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{order.date}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => onEditClick?.()}
            className="text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Edit order"
            title={canEdit ? "Edit order" : "Order details are still loading"}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={!canCancel}
            onClick={() => onCancelClick?.()}
            className="text-muted-foreground hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Cancel order"
            title={canCancel ? "Cancel order" : "Orders can't be cancelled once they reach invoicing"}
          >
            <Ban className="w-4 h-4" />
          </button>
          <SheetClose className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="w-5 h-5" />
          </SheetClose>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground tracking-wide mb-3">
            Customer &amp; Vehicle
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Customer</p>
              <p className="font-medium">{order.customer}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Vehicle</p>
              <p className="font-medium">{order.vehicle}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Plate</p>
              <p className="font-medium">{order.plateNumber}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="font-medium">{order.vehicleType ?? order.vehicle_type}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">VIN Number</p>
              <p className="font-medium">{order.vinNumber ?? '—'}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Current Mileage</p>
              <p className="font-medium">{order.currentMileage == 0 ? '—' : order.currentMileage}</p>
            </div>
          </div>
        </div>

        {StageComponent ? (
          <StageComponent order={order} onUpdateOrder={onUpdateOrder} />
        ) : (
          <p className="text-sm text-destructive">Unknown status: {order.status}</p>
        )}
      </div>
    </div>
  );
}