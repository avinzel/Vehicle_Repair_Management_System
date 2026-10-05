"use client"

import { X, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { SheetClose } from "@/components/ui/sheet";
import { formatStatusLabel } from "@/utils/formatStatusLabel";
import { ORDER_STAGES } from "@/components/OrderStages";

// The Customer & Vehicle block and the header stay constant across every
// status. The stage section in the middle is the only part that actually
// changes shape as the order moves through the pipeline.
export function RepairOrderDetail({ order, onUpdateOrder }) {
  if (!order) return null;

  const statusLabel = formatStatusLabel(order.status);
  const StageComponent = ORDER_STAGES[statusLabel];

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
            disabled
            className="text-muted-foreground/40 cursor-not-allowed"
            aria-label="Edit order"
            title="Editing an order isn't available yet — no backend endpoint exists for it."
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled
            className="text-muted-foreground/40 cursor-not-allowed"
            aria-label="Delete order"
            title="Cancelling an order isn't available yet — no backend endpoint exists for it."
          >
            <Trash2 className="w-4 h-4" />
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