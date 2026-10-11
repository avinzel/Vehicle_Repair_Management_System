"use client"

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { SheetClose } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/StatusBadge";

const API = "http://localhost:8000/api.php";

const PAYMENT_LABELS = {
  CASH: "Cash",
  GCASH: "GCash",
};

function formatPeso(amount) {
  return `₱${Number(amount ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  if (isNaN(d)) return value;
  return d.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Tile({ label, children, className = "" }) {
  return (
    <div className={`bg-secondary/50 rounded-lg p-3 ${className}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{children}</p>
    </div>
  );
}

// Each request fails independently — a missing invoice shouldn't blank out
// the services/parts sections.
function getJson(url) {
  return fetch(url, { credentials: "include" })
    .then((res) => res.json())
    .catch(() => null);
}

// `order` is the normalized history row (id, customer, vehicle, plate,
// completedDate, total) — enough to paint the header and summary tiles
// immediately. Everything below loads from three existing endpoints:
//   repair order details -> complaint, diagnosis, services, mechanics
//   parts-by-order       -> parts (cancelled rows already excluded by the SP)
//   invoice details      -> labor/parts/discount/tax and payment info
export function OrderHistoryDetail({ order }) {
  const [details, setDetails] = useState(null);
  const [parts, setParts] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);

  const rawId = order?.rawId;

  useEffect(() => {
    if (rawId == null) return;
    let cancelled = false;
    setDetails(null);
    setParts([]);
    setInvoice(null);
    setLoading(true);

    const id = encodeURIComponent(rawId);
    Promise.all([
      getJson(`${API}?action=repair-orders&category=active&order_id=${id}`),
      getJson(`${API}?action=repair-orders&category=parts-by-order&order_id=${id}`),
      getJson(`${API}?action=invoices&order_id=${id}`),
    ]).then(([detailsJson, partsJson, invoiceJson]) => {
      if (cancelled) return;
      setDetails(detailsJson?.status === "success" ? detailsJson.data : null);
      setParts(partsJson?.status === "success" && Array.isArray(partsJson.data) ? partsJson.data : []);
      setInvoice(invoiceJson?.status === "success" ? invoiceJson.data : null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [rawId]);

  if (!order) return null;

  const services = Array.isArray(details?.services) ? details.services : [];
  const mechanics = Array.isArray(details?.assigned_mechanics) ? details.assigned_mechanics : [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 p-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{order.id}</h2>
            <StatusBadge status="FULFILLED" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Completed {order.completedDate ?? "—"}</p>
        </div>
        <SheetClose className="text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="w-5 h-5" />
        </SheetClose>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground tracking-wide mb-3">
            Customer &amp; Vehicle
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Customer">{order.customer}</Tile>
            <Tile label="Vehicle">{order.vehicle}</Tile>
            <Tile label="Plate">{order.plateNumber}</Tile>
            <Tile label="Type">{order.vehicleType}</Tile>
            <Tile label="Received">{details?.formatted_date ?? (loading ? "Loading..." : "—")}</Tile>
            <Tile label="Total Paid">{order.totalLabel}</Tile>
          </div>
        </div>

        {details?.complaint && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground tracking-wide mb-3">
            Customer Complaint
            </h3>
            <p className="text-sm bg-secondary/50 rounded-lg p-3">{details.complaint}</p>
          </div>
        )}

        {details?.diagnosis_notes && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground tracking-wide mb-3">
            Customer Complaint
            </h3>
            <p className="text-sm bg-secondary/50 rounded-lg p-3">{details.diagnosis_notes}</p>
            {details.formatted_diagnosis_date && (
              <p className="text-xs text-muted-foreground mt-1.5">Filed {details.formatted_diagnosis_date}</p>
            )}
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground tracking-wide mb-3">
            Customer Complaint
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading services...</p>
          ) : services.length > 0 ? (
            <div className="space-y-2">
              {services.map((s) => (
                <div
                  key={s.order_service_id}
                  className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2.5 text-sm"
                >
                  <span>{s.service_name}</span>
                  <span className="font-medium">{formatPeso(s.labor_cost)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No services recorded.</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground tracking-wide mb-3">
            Parts Used
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading parts...</p>
          ) : parts.length > 0 ? (
            <div className="space-y-2">
              {parts.map((p) => (
                <div
                  key={p.order_part_id}
                  className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2.5 text-sm"
                >
                  <div>
                    <p>{p.part_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.quantity_used} × {formatPeso(p.unit_price_at_use)}
                    </p>
                  </div>
                  <span className="font-medium">{formatPeso(p.subtotal)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No parts used.</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground tracking-wide mb-3">
            Mechanics on Job
            </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading mechanics...</p>
          ) : mechanics.length > 0 ? (
            <div className="space-y-1.5">
              {mechanics.map((m) => (
                <div
                  key={m.assignment_id}
                  className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2.5 text-sm"
                >
                  <span>{m.mechanic_name}</span>
                  <span className="text-muted-foreground">{m.position_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No mechanics on record for this job.</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground tracking-wide mb-3">
            Invoice &amp; Payment
            </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading invoice...</p>
          ) : invoice ? (
            <div className="space-y-3">
              <div className="border border-border rounded-lg overflow-hidden text-sm">
                <div className="flex justify-between px-3 py-2.5">
                  <span>Labor Charges</span>
                  <span>{formatPeso(invoice.labor_charges)}</span>
                </div>
                <div className="flex justify-between px-3 py-2.5 border-t border-border">
                  <span>Parts &amp; Materials</span>
                  <span>{formatPeso(invoice.parts_charges)}</span>
                </div>
                {Number(invoice.discount) > 0 && (
                  <div className="flex justify-between px-3 py-2.5 border-t border-border">
                    <span>Discount</span>
                    <span>−{formatPeso(invoice.discount)}</span>
                  </div>
                )}
                {Number(invoice.tax_amount) > 0 && (
                  <div className="flex justify-between px-3 py-2.5 border-t border-border">
                    <span>Tax</span>
                    <span>{formatPeso(invoice.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between px-3 py-2.5 border-t border-border font-bold">
                  <span>Total Paid</span>
                  <span className="text-primary">{formatPeso(invoice.total_due)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Tile label="Payment Method">
                  {PAYMENT_LABELS[invoice.payment_method] ?? invoice.payment_method ?? "—"}
                </Tile>
                <Tile label="Paid On">{formatDateTime(invoice.payment_date)}</Tile>
                <Tile label="Reference" className="col-span-2">
                  {invoice.payment_reference ?? "—"}
                </Tile>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Invoice details unavailable.</p>
          )}
        </div>
      </div>
    </div>
  );
}