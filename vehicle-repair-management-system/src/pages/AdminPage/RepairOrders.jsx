"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Pencil, Ban } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RepairOrderFormDialog } from "@/components/dialogs/RepairOrderFormDialog";
import { OrderFilterBar } from "@/components/OrderSearchFilter";
import { formatStatusLabel } from "@/utils/formatStatusLabel";

const API = "http://localhost:8000/api.php";

const STATUS_TABS = [
  "All",
  "Pending Diagnosis",
  "Awaiting Diagnosis",
  "Pending Mechanics",
  "In Progress",
  "Awaiting Parts",
  "Ready to Invoice",
  "Awaiting Payment",
  "Ready for Release",
  "Fulfilled",
  "Cancelled",
];

// Orders at or past READY_TO_INVOICE can't be cancelled (API rule), and
// cancelled orders have nothing left to cancel.
const NOT_CANCELLABLE = [
  "READY_TO_INVOICE",
  "AWAITING_PAYMENT",
  "READY_FOR_RELEASE",
  "FULFILLED",
  "CANCELLED",
];

const PRIORITY_STYLE = {
  STANDARD: "bg-secondary text-secondary-foreground",
  URGENT: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  RUSH: "bg-red-100 text-red-800 hover:bg-red-100",
};

// Row shape follows GET action=repair-orders&category=management.
function normalizeRepairOrder(raw) {
  const vehicle = [raw.manufacturer, raw.model, raw.year_model].filter(Boolean).join(" ");
  return {
    rawId: raw.order_id,
    id: raw.formatted_order_id ?? `RO-${raw.order_id}`,
    customer: raw.customer_name ?? "—",
    contactNo: raw.contact_no ?? "",
    vehicle: vehicle || "—",
    vehicleType: raw.vehicle_type ?? null,
    plateNumber: raw.plate_number ?? null,
    status: raw.status,
    priority: raw.priority ?? "STANDARD",
    complaint: raw.complaint ?? "",
    diagnosisNotes: raw.diagnosis_notes ?? "",
    mileage: raw.mileage_at_service ?? null,
    dateReceived: raw.date_received ?? null,
    mechanics: raw.assigned_mechanics ?? "",
    invoiceTotal: raw.invoice_total != null ? Number(raw.invoice_total) : null,
  };
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatPeso(amount) {
  if (amount == null) return "—";
  return `₱${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

async function request(url, options) {
  const res = await fetch(url, { credentials: "include", ...options });
  const json = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? json.message ?? `Request failed (HTTP ${res.status})`);
  return json;
}

// Endpoints (Repair Orders API):
//   GET    action=repair-orders&category=management[&status=][&search=]  -> { data: [...] }
//   PUT    action=repair-orders&put-method=update-order  { order_id, complaint, priority, mileage_at_service, diagnosis_notes }
//   DELETE action=repair-orders&order_id=X                (cancel; 409 once READY_TO_INVOICE or later)
// No create here: new orders come from Vehicle Intake (service advisor).
export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const firstLoad = useRef(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [cancelling, setCancelling] = useState(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const getOrders = useCallback(async (query = "", signal) => {
    setLoadError(null);
    try {
      const q = query.trim();
      const json = await request(
        `${API}?action=repair-orders&category=management${q ? `&search=${encodeURIComponent(q)}` : ""}`,
        { signal }
      );
      setOrders((json.data ?? []).map(normalizeRepairOrder));
    } catch (err) {
      if (err.name !== "AbortError") setLoadError(err.message || "Failed to load repair orders");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  // Server-side search (order ID, customer, plate, model), debounced.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => getOrders(search, controller.signal),
      firstLoad.current ? 0 : 300
    );
    firstLoad.current = false;
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, getOrders]);

  // Status tabs filter client-side so tab switches are instant.
  const filteredOrders = useMemo(() => {
    const sorted = [...orders].sort((a, b) => (b.rawId ?? 0) - (a.rawId ?? 0));
    if (statusFilter === "All") return sorted;
    return sorted.filter((o) => formatStatusLabel(o.status) === statusFilter);
  }, [orders, statusFilter]);

  function openEdit(order) {
    setEditing(order);
    setFormOpen(true);
  }

  async function handleSubmit(payload) {
    await request(`${API}?action=repair-orders&put-method=update-order`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await getOrders(search);
  }

  async function handleCancel() {
    setCancelBusy(true);
    setCancelError(null);
    try {
      await request(`${API}?action=repair-orders&order_id=${encodeURIComponent(cancelling.rawId)}`, {
        method: "DELETE",
      });
      setCancelling(null);
      await getOrders(search);
    } catch (err) {
      setCancelError(err.message || "Failed to cancel repair order");
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <div className="w-full">
      <div className="sticky top-[73px] z-10 bg-card -mx-6 -mt-6 border-b border-border">
        <OrderFilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          placeholder="Search by order ID, customer, plate, or vehicle..."
          tabs={STATUS_TABS}
        />
      </div>

      <div className="pt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-bold pb-1">Repair Orders</CardTitle>
            <CardDescription>
              {filteredOrders.length} order{filteredOrders.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loadError && (
              <p role="alert" className="mb-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                {loadError}
              </p>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm font-medium text-tertiary">Order</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Customer</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Vehicle</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Status</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Priority</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Mechanics</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Invoice</TableHead>
                  <TableHead className="text-right text-sm font-medium text-tertiary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((o) => {
                  const canCancel = !NOT_CANCELLABLE.includes(o.status);
                  const canEdit = o.status !== "CANCELLED";
                  return (
                    <TableRow key={o.rawId}>
                      <TableCell>
                        <p className="font-medium">{o.id}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(o.dateReceived)}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{o.customer}</p>
                        <p className="text-xs text-muted-foreground">{o.contactNo || "—"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{o.vehicle}</p>
                        <p className="text-xs text-muted-foreground">
                          {[o.plateNumber, o.vehicleType].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={PRIORITY_STYLE[o.priority]}>
                          {o.priority.charAt(0) + o.priority.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[180px] whitespace-normal">
                        <span className="line-clamp-2">{o.mechanics || "Unassigned"}</span>
                      </TableCell>
                      <TableCell className="font-medium">{formatPeso(o.invoiceTotal)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${o.id}`}
                            title={canEdit ? "Edit order" : "Cancelled orders can't be edited"}
                            className="hover:text-muted-foreground"
                            disabled={!canEdit}
                            onClick={() => openEdit(o)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Cancel ${o.id}`}
                            title={
                              canCancel
                                ? "Cancel order"
                                : "Orders can't be cancelled once ready to invoice or cancelled"
                            }
                            className="hover:text-destructive"
                            disabled={!canCancel}
                            onClick={() => {
                              setCancelError(null);
                              setCancelling(o);
                            }}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {!loading && filteredOrders.length === 0 && !loadError && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                      {search.trim() || statusFilter !== "All"
                        ? "No repair orders match your filters."
                        : "No repair orders yet."}
                    </TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                      Loading repair orders...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <RepairOrderFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          order={editing}
          onSubmit={handleSubmit}
        />

        <ConfirmDialog
          open={!!cancelling}
          onOpenChange={(open) => !open && !cancelBusy && setCancelling(null)}
          title="Cancel repair order?"
          description={`${cancelling?.id ?? "This order"} will be cancelled. Any parts already issued to it are returned to inventory and pending part requests are cancelled. This can't be undone.`}
          confirmLabel="Cancel order"
          destructive
          loading={cancelBusy}
          error={cancelError}
          onConfirm={handleCancel}
        />
      </div>
    </div>
  );
}