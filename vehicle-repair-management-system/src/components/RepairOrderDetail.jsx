"use client"

import { X, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { SheetClose } from "@/components/ui/sheet";
import { formatStatusLabel } from "@/utils/formatStatusLabel";
import { ORDER_STAGES } from "@/components/OrderStages";

function formatCurrency(amount) {
  if (amount == null) return null;
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

// The Customer & Vehicle block and the header stay constant across every
// status. The stage section in the middle is the only part that actually
// changes shape as the order moves through the pipeline.
export function RepairOrderDetail({ order, onUpdateOrder }) {
  if (!order) return null;

  const statusLabel = formatStatusLabel(order.status);
  const StageComponent = ORDER_STAGES[statusLabel];
  const amountLabel = formatCurrency(order.amount);

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
            className="text-muted-foreground hover:text-foreground"
            aria-label="Edit order"
            onClick={() => console.log("Edit", order.id)}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-destructive"
            aria-label="Delete order"
            onClick={() => console.log("Delete", order.id)}
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
              <p className="font-medium">{order.plate}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="font-medium">{order.vehicleType}</p>
            </div>
          </div>
        </div>

        {StageComponent ? (
          <StageComponent order={order} onUpdateOrder={onUpdateOrder} />
        ) : (
          <p className="text-sm text-destructive">Unknown status: {order.status}</p>
        )}

        {/* {amountLabel && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Amount</h3>
            <p className="text-2xl font-bold">{amountLabel}</p>
          </div>
        )} */}
      </div>
    </div>
  );
}