"use client"

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeInvoiceDetail } from "@/utils/normalizeOrder";

const API = "http://localhost:8000/api.php";

function formatCurrency(amount) {
  if (amount == null || amount === "") return null;
  return `₱${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

// The invoices.payment_method column is ENUM('CASH','GCASH','BANK_TRANSFER'),
// so the API must receive the enum value, not the display label.
const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "GCASH", label: "GCash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
];

function methodLabel(value) {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value ?? "—";
}


// function normalizeInvoiceDetail(data) {
//   let main = null;
//   let mechanics = [];

//   if (Array.isArray(data)) {
//     if (Array.isArray(data[0])) {
//       main = data[0][0] ?? null;
//       mechanics = Array.isArray(data[1]) ? data[1] : [];
//     } else {
//       main = data[0] ?? null;
//     }
//   } else if (data && typeof data === "object") {
//     main = data.invoice ?? data.summary ?? data.order ?? data;
//     mechanics = data.mechanics ?? [];
//   }

//   if (!main) return null;
//   return {
//     laborCharges: Number(main.labor_charges ?? 0),
//     partsCharges: Number(main.parts_charges ?? 0),
//     discount: Number(main.discount ?? 0),
//     taxAmount: Number(main.tax_amount ?? 0),
//     totalDue: Number(main.total_due ?? 0),
//     invoiceStatus: main.invoice_status ?? null,
//     paymentMethod: main.payment_method ?? null,
//     paymentReference: main.payment_reference ?? null,
//     paymentDate: main.payment_date ?? null,
//     team: mechanics.map((m) => ({
//       id: m.assignment_id,
//       name: m.mechanic_name,
//       role: m.position,
//     })),
//   };
//}

// Distinct from RepairOrderDetail/ORDER_STAGES on purpose: the generic
// drawer only shows an amount + "Open Invoice →" link, while this richer
// breakdown/payment view exists ONLY on the Billing & Invoicing page.
// BillingInvoicing's DetailDrawer owns open/close; this renders content.
//
// Pipeline handled here (matches the backend):
//   READY_TO_INVOICE  --Generate Invoice-->  AWAITING_PAYMENT
//   AWAITING_PAYMENT  --Confirm Payment-->   FULFILLED
// (sp_process_invoice_payment fulfills the order directly; there is no
// separate "release vehicle" transition.)
export function InvoiceDetail({ order, onUpdateOrder, onClose }) {
  // Hooks must run before any early return.
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const rawId = order?.rawId;
  const status = order?.status;

  const fetchDetails = useCallback(async () => {
    if (rawId == null) return;
    setLoading(true);
    try {
      const response = await fetch(`${API}?action=invoices&order_id=${encodeURIComponent(rawId)}`, {
        credentials: "include",
      });
      const json = await response.json();
      if (json.status === "success") {
        setDetails(normalizeInvoiceDetail(json.data));
      } else {
        console.error("Failed to fetch invoice details:", json.error ?? json);
        setDetails(null);
      }
    } catch (err) {
      console.error("Failed to fetch invoice details:", err);
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [rawId]);

  // Reload when a different order opens OR its status changes (after
  // generate/pay, the parent refresh flips status and this re-pulls).
  useEffect(() => {
    setDetails(null);
    setError(null);
    fetchDetails();
  }, [fetchDetails, status]);

  useEffect(() => {
    setReference("");
    setTaxRate("0");
    setDiscount("0");
    setSelectedMethod("CASH");
  }, [rawId]);

  if (!order) return null;

  const isReadyToInvoice = status === "READY_TO_INVOICE";
  const isAwaitingPayment = status === "AWAITING_PAYMENT";
  const isReadyForRelease = status === "READY_FOR_RELEASE"; // new
  const isClosed = status === "FULFILLED" || status === "READY_FOR_RELEASE";

  const labor = details?.laborCharges ?? 0;
  const parts = details?.partsCharges ?? 0;

  // Preview mirrors sp_mark_awaiting_payment: tax = (subtotal - discount) * rate/100.
  const taxNum = Number(taxRate);
  const discountNum = Number(discount);
  const inputsValid =
    Number.isFinite(taxNum) && taxNum >= 0 && Number.isFinite(discountNum) && discountNum >= 0;
  const subtotal = labor + parts;
  const previewTax = inputsValid ? Math.max(subtotal - discountNum, 0) * (taxNum / 100) : 0;
  const previewTotal = inputsValid ? Math.max(subtotal - discountNum, 0) + previewTax : subtotal;

  const displayTotal = isReadyToInvoice
    ? previewTotal
    : details?.totalDue || Number(order.amount ?? 0);
  const totalLabel = formatCurrency(displayTotal);

  const team = details?.team ?? order.team ?? [];

  async function post(url, body) {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json.status !== "success") {
        throw new Error(json.error ?? json.message ?? `Request failed (HTTP ${response.status})`);
      }
      // Parent refreshes all order lists; the status effect above then
      // re-pulls this invoice.
      await onUpdateOrder(order.id);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleGenerateInvoice() {
    if (!inputsValid) {
      setError("Tax rate and discount must be non-negative numbers.");
      return;
    }
    post(`${API}?action=invoices`, {
      order_id: Number(rawId),
      tax_rate: taxNum,
      discount: discountNum,
    });
  }

  function handleConfirmPayment() {
    const body = { order_id: Number(rawId), payment_method: selectedMethod };
    // Optional — the backend generates a PAY-XXXX reference when omitted.
    if (reference.trim()) body.payment_reference = reference.trim();
    post(`${API}?action=invoices&post-method=payment`, body);
  }

  function handleReleaseVehicle() {
  post(`${API}?action=invoices&post-method=release-vehicle`, {
    order_id: Number(rawId),
  });
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
          <h3 className="text-sm font-semibold text-muted-foreground tracking-wide mb-3">
            Invoice Breakdown
          </h3>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 bg-secondary/50 px-3 py-2 text-xs font-medium text-muted-foreground">
              <span>Description</span>
              <span className="text-right">Amount</span>
            </div>

            {loading && !details ? (
              <p className="px-3 py-3 text-sm text-muted-foreground border-t border-border">
                Loading breakdown...
              </p>
            ) : details ? (
              <>
                <div className="grid grid-cols-2 px-3 py-2.5 text-sm border-t border-border">
                  <span>Labor Charges</span>
                  <span className="text-right">{formatCurrency(labor)}</span>
                </div>
                <div className="grid grid-cols-2 px-3 py-2.5 text-sm border-t border-border">
                  <span>Parts &amp; Materials</span>
                  <span className="text-right">{formatCurrency(parts)}</span>
                </div>
                {(isReadyToInvoice ? discountNum : details.discount) > 0 && (
                  <div className="grid grid-cols-2 px-3 py-2.5 text-sm border-t border-border">
                    <span>Discount</span>
                    <span className="text-right">
                      −{formatCurrency(isReadyToInvoice ? discountNum : details.discount)}
                    </span>
                  </div>
                )}
                {(isReadyToInvoice ? previewTax : details.taxAmount) > 0 && (
                  <div className="grid grid-cols-2 px-3 py-2.5 text-sm border-t border-border">
                    <span>Tax</span>
                    <span className="text-right">
                      {formatCurrency(isReadyToInvoice ? previewTax : details.taxAmount)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="px-3 py-3 text-sm text-muted-foreground border-t border-border">
                No breakdown available.
              </p>
            )}

            <div className="grid grid-cols-2 px-3 py-2.5 text-sm font-bold border-t border-border">
              <span>{isReadyToInvoice ? "Estimated Total" : "Total Due"}</span>
              <span className="text-right text-primary">{totalLabel ?? "—"}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground tracking-wide mb-3">
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

        {error && (
          <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            {error}
          </p>
        )}

        {isReadyToInvoice && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">
              Invoice Adjustments
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Tax rate (%)</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  disabled={submitting}
                  className="w-full border border-input rounded-md h-9 px-3 bg-background"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">Discount (₱)</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  disabled={submitting}
                  className="w-full border border-input rounded-md h-9 px-3 bg-background"
                />
              </label>
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={submitting || loading || !details}
              onClick={handleGenerateInvoice}
            >
              {submitting ? "Generating..." : "Generate Invoice"}
            </Button>
          </div>
        )}

        {isAwaitingPayment && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground tracking-wide">
              Payment Method
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  disabled={submitting}
                  onClick={() => setSelectedMethod(method.value)}
                  className={`rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    selectedMethod === method.value
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={submitting}
              placeholder="Payment reference (optional — auto-generated if blank)"
              className="w-full border border-input rounded-md h-9 px-3 text-sm bg-background"
            />
            <Button type="button" className="w-full" disabled={submitting} onClick={handleConfirmPayment}>
              {submitting ? "Processing..." : `Confirm Payment · ${totalLabel ?? ""}`}
            </Button>
          </div>
        )}

        {isClosed && (
          <div className="bg-secondary/50 rounded-lg px-3 py-2.5 text-sm text-muted-foreground space-y-1">
            <p>Paid via {methodLabel(details?.paymentMethod ?? order.paymentMethod)}</p>
            {details?.paymentReference && <p>Reference: {details.paymentReference}</p>}
            {details?.paymentDate && <p>Paid on: {details.paymentDate}</p>}
          </div>
        )}

        {isReadyForRelease && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground tracking-wide">
              Vehicle Release
            </h3>
            <p className="text-sm text-muted-foreground">
              Payment received. Hand the vehicle back to the customer, then release it to close this order.
            </p>
            <Button
              type="button"
              className="w-full"
              disabled={submitting}
              onClick={handleReleaseVehicle}
            >
              {submitting ? "Releasing..." : "Release Vehicle"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}