"use client"

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatCurrency(amount) {
  if (amount == null) return null;
  return `₱${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

const PAYMENT_METHODS = ["Cash", "GCash", "Bank Transfer"];

// This is a distinct component from RepairOrderDetail/ORDER_STAGES —
// deliberately so. The generic drawer (used on Active Repair Orders)
// only ever shows a lightweight amount + "Open Invoice →" link for
// invoicing-adjacent statuses (see InvoicingStub in OrderStages.jsx).
// This richer breakdown/payment view exists ONLY on the Billing &
// Invoicing page, reached by that link. Close (X) is intentionally not
// wired here — BillingInvoicing.jsx's DetailDrawer owns open/close via
// onOpenChange, same as every other drawer in this app; this component
// only renders drawer *content*.
export function InvoiceDetail({ order, onUpdateOrder, onClose }) {
  if (!order) return null;

  const [selectedMethod, setSelectedMethod] = useState(order.paymentMethod ?? "Cash");

  const laborLabel = formatCurrency(order.laborCharges);
  const partsLabel = formatCurrency(order.partsCharges);
  const totalLabel = formatCurrency(order.amount);
  const team = order.team ?? [];

  function handleGenerateInvoice() {
    // TODO: backend not built yet — real invoice generation likely needs
    // its own endpoint/procedure (compute labor + parts from the order's
    // logged services/parts). This just advances status locally for now.
    onUpdateOrder(order.id, { status: "AWAITING_PAYMENT" });
  }

  function handleConfirmPayment() {
    // TODO: backend not built yet — maps to
    // POST action=invoices&post-method=payment
    // { order_id, payment_method, payment_reference }
    onUpdateOrder(order.id, { status: "READY_FOR_RELEASE", paymentMethod: selectedMethod });
  }

  function handleReleaseVehicle() {
    onUpdateOrder(order.id, { status: "FULFILLED" });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between p-6 border-b border-border">
        <div>
          <h2 className="text-lg font-bold">Invoice · {order.id}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {order.customer} · {order.vehicle}
          </p>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wide mb-3 uppercase">
            Invoice Breakdown
          </h3>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 bg-secondary/50 px-3 py-2 text-xs font-medium text-muted-foreground">
              <span>Description</span>
              <span className="text-right">Amount</span>
            </div>
            {laborLabel && (
              <div className="grid grid-cols-2 px-3 py-2.5 text-sm border-t border-border">
                <span>Labor Charges</span>
                <span className="text-right">{laborLabel}</span>
              </div>
            )}
            {partsLabel && (
              <div className="grid grid-cols-2 px-3 py-2.5 text-sm border-t border-border">
                <span>Parts &amp; Materials</span>
                <span className="text-right">{partsLabel}</span>
              </div>
            )}
            {!laborLabel && !partsLabel && (
              <p className="px-3 py-3 text-sm text-muted-foreground border-t border-border">
                No breakdown available yet.
              </p>
            )}
            <div className="grid grid-cols-2 px-3 py-2.5 text-sm font-bold border-t border-border">
              <span>Total Due</span>
              <span className="text-right text-primary">{totalLabel ?? "—"}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wide mb-3 uppercase">
            Mechanics on Job
          </h3>
          {team.length > 0 ? (
            <div className="space-y-1.5">
              {team.map((member) => (
                <div
                  key={member.id ?? member.name}
                  className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2.5 text-sm"
                >
                  <span>{member.name}</span>
                  <span className="text-muted-foreground">{member.role}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No mechanics on record for this job.</p>
          )}
        </div>

        {order.status === "READY_TO_INVOICE" && (
          <Button type="button" className="w-full" onClick={handleGenerateInvoice}>
            Generate Invoice
          </Button>
        )}

        {order.status === "AWAITING_PAYMENT" && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
              Payment Method
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setSelectedMethod(method)}
                  className={`rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    selectedMethod === method
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
            <Button type="button" className="w-full" onClick={handleConfirmPayment}>
              Confirm Payment · {totalLabel}
            </Button>
          </div>
        )}

        {order.status === "READY_FOR_RELEASE" && (
          <div className="space-y-3">
            <div className="bg-secondary/50 rounded-lg px-3 py-2.5 text-sm text-muted-foreground">
              Paid via {order.paymentMethod ?? selectedMethod}
            </div>
            <Button
              type="button"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={handleReleaseVehicle}
            >
              ✓ Release Vehicle
            </Button>
          </div>
        )}

        {order.status === "FULFILLED" && (
          <div className="bg-secondary/50 rounded-lg px-3 py-2.5 text-sm text-muted-foreground">
            Paid via {order.paymentMethod ?? "—"} · Vehicle released
          </div>
        )}
      </div>
    </div>
  );
}