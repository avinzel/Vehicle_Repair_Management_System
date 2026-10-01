"use client"

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useOutletContext } from "react-router";
import { Check, ChevronsUpDown, ArrowUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderCard } from "@/components/OrderCard";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { normalizePart, normalizeLoggedPart } from "@/utils/normalizeOrder";

const API = "http://localhost:8000/api.php";

// Only these statuses accept parts. Must match the guard in
// sp_log_repair_order_part (IN_PROGRESS / AWAITING_PARTS) and
// canLogParts in MechanicOrderStages.jsx.
const LOGGABLE_STATUSES = ["IN_PROGRESS", "AWAITING_PARTS"];

// --- Normalizers -----------------------------------------------------
// These map the exact columns returned by the stored procedures, so they
// no longer go through normalizeOrder (which is shaped for repair orders).
// MySQL/PDO often returns DECIMAL and INT columns as strings, hence Number().


function formatPeso(amount) {
  const n = Number(amount) || 0;
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: n % 1 === 0 ? 0 : 2 })}`;
}

const STATUS_LABEL = {
  ISSUED: "Issued",
  PENDING_PARTS: "Pending",
  CANCELLED: "Cancelled",
};

const STATUS_BADGE_STYLE = {
  ISSUED: "bg-green-100 text-green-800 hover:bg-green-100",
  PENDING_PARTS: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function PartsLogger() {
  // tableData comes from MechanicPage, same source as Assigned Orders,
  // Diagnostic Log and the sidebar badge.
  const { tableData, getTableData } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [inventory, setInventory] = useState([]);
  const [loggedPartsByOrder, setLoggedPartsByOrder] = useState({});

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [confirmingCancelId, setConfirmingCancelId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Refresh the shared order list when landing here.
  useEffect(() => {
    getTableData();
  }, [getTableData]);

  // Orders the mechanic can actually log parts against.
  const eligibleOrders = useMemo(() => {
    const orders = Array.isArray(tableData) ? tableData : [];
    return orders.filter((o) => LOGGABLE_STATUSES.includes(o.status));
  }, [tableData]);

  const fetchInventory = useCallback(async () => {
    try {
      const response = await fetch(`${API}?action=parts&status=ACTIVE`, {
        credentials: "include",
      });
      const json = await response.json();
      if (Array.isArray(json.data)) {
        setInventory(json.data.map(normalizePart));
      } else {
        console.error("Failed to fetch parts inventory:", json.error ?? json);
      }
    } catch (err) {
      console.error("Failed to fetch parts inventory:", err);
    }
  }, []);

  const fetchLoggedParts = useCallback(async (rawOrderId) => {
    if (rawOrderId == null) return;
    try {
      const response = await fetch(
        `${API}?action=repair-orders&category=parts-by-order&order_id=${encodeURIComponent(rawOrderId)}`,
        { credentials: "include" }
      );
      const json = await response.json();
      const rows = Array.isArray(json.data) ? json.data : [];
      setLoggedPartsByOrder((prev) => ({ ...prev, [rawOrderId]: rows.map(normalizeLoggedPart) }));
    } catch (err) {
      console.error("Failed to fetch logged parts for order", rawOrderId, err);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const selectedOrder = eligibleOrders.find((o) => o.id === selectedOrderId) ?? null;

  // Load this order's logged parts as soon as it's selected.
  useEffect(() => {
    if (selectedOrder?.rawId != null) fetchLoggedParts(selectedOrder.rawId);
  }, [selectedOrder?.rawId, fetchLoggedParts]);

  // Redirect-and-preselect: "+ Log Parts Used" links here with ?order_id=<rawId>.
  useEffect(() => {
    const paramOrderId = searchParams.get("order_id");
    if (paramOrderId && eligibleOrders.length > 0) {
      const match = eligibleOrders.find((o) => String(o.rawId) === String(paramOrderId));
      if (match) setSelectedOrderId(match.id);
      setSearchParams({}, { replace: true });
    }
  }, [eligibleOrders, searchParams, setSearchParams]);

  // If the selected order drops out of the eligible list (e.g. status changed), deselect it.
  useEffect(() => {
    if (selectedOrderId != null && !selectedOrder) setSelectedOrderId(null);
  }, [selectedOrderId, selectedOrder]);

  const selectedPart = inventory.find((p) => p.part_id === selectedPartId) ?? null;
  const loggedForSelectedOrder = selectedOrder ? loggedPartsByOrder[selectedOrder.rawId] ?? [] : [];
  const visibleLogged = loggedForSelectedOrder.filter((r) => r.status !== "CANCELLED");

  const isOverStock = selectedPart ? quantity > selectedPart.quantity_on_hand : false;
  const subtotal = selectedPart ? selectedPart.unit_price * quantity : 0;

  function resetPartSelection() {
    setSelectedPartId(null);
    setQuantity(1);
  }

  function handleSelectOrder(orderId) {
    setSelectedOrderId(orderId);
    setActionError(null);
    setConfirmingCancelId(null);
    resetPartSelection();
  }

  async function handleLogPart() {
    if (!selectedOrder || !selectedPart || quantity < 1 || submitting) return;

    setSubmitting(true);
    setActionError(null);
    try {
      const response = await fetch(`${API}?action=repair-orders&post-method=log-part`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: selectedOrder.rawId,
          part_id: selectedPart.part_id,
          quantity,
        }),
      });
      const json = await response.json().catch(() => ({}));

      if (response.ok && json.status === "success") {
        // The SP decides ISSUED vs PENDING_PARTS server-side (and may flip the
        // order to AWAITING_PARTS), so refetch everything instead of guessing.
        await Promise.all([fetchInventory(), fetchLoggedParts(selectedOrder.rawId), getTableData()]);
        resetPartSelection();
      } else {
        setActionError(json.error ?? json.message ?? `Failed to log part (HTTP ${response.status})`);
      }
    } catch (err) {
      console.error("Failed to log part:", err);
      setActionError("Something went wrong while logging the part. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Real endpoint: PUT action=repair-orders&put-method=cancel-order-part
  async function handleCancelPart(row) {
    if (!selectedOrder) return;

    setActionError(null);
    try {
      const response = await fetch(
        `${API}?action=repair-orders&put-method=cancel-order-part`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_part_id: row.order_part_id }),
        }
      );
      const json = await response.json().catch(() => ({}));

      if (response.ok && json.status === "success") {
        await Promise.all([fetchInventory(), fetchLoggedParts(selectedOrder.rawId), getTableData()]);
      } else {
        setActionError(json.error ?? json.message ?? `Failed to cancel part (HTTP ${response.status})`);
      }
    } catch (err) {
      console.error("Failed to cancel part:", err);
      setActionError("Something went wrong while cancelling the part. Please try again.");
    } finally {
      setConfirmingCancelId(null);
    }
  }

  const partsTotal = visibleLogged.reduce((sum, r) => sum + r.unit_price * r.quantity_used, 0);

  return (
    <div className="w-full">
      <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* LEFT: order list, with the logging form expanding inline under the selected card. */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Repair Order</h3>

          {eligibleOrders.map((order) => (
            <div key={order.id} className="space-y-3">
              <OrderCard
                order={order}
                isSelected={selectedOrderId === order.id}
                onClick={() => handleSelectOrder(order.id)}
              />

              {selectedOrderId === order.id && selectedOrder && (
                <div className="space-y-4 border border-border rounded-xl p-4">
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground tracking-wide mb-2 uppercase">
                      Select Part from Inventory
                    </h3>
                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={comboboxOpen}
                          className="w-full justify-between font-normal bg-background"
                        >
                          {selectedPart
                            ? `${selectedPart.part_name} · ${formatPeso(selectedPart.unit_price)} · ${selectedPart.quantity_on_hand} left`
                            : "Choose a part..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search parts..." />
                          <CommandList>
                            <CommandEmpty>No part found.</CommandEmpty>
                            <CommandGroup>
                              {inventory.map((part) => (
                                <CommandItem
                                  key={part.part_id}
                                  value={part.part_name}
                                  onSelect={() => {
                                    setSelectedPartId(part.part_id);
                                    setQuantity(1);
                                    setComboboxOpen(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${selectedPartId === part.part_id ? "opacity-100" : "opacity-0"}`}
                                  />
                                  <span className="flex-1">{part.part_name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatPeso(part.unit_price)} · {part.quantity_on_hand} left
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {selectedPart && (
                    <>
                      <div className="bg-secondary/50 rounded-lg p-3 space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Part</span>
                          <span className="font-medium">{selectedPart.part_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Unit Cost</span>
                          <span className="font-medium">{formatPeso(selectedPart.unit_price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">In Stock</span>
                          <span className="font-medium">
                            {selectedPart.quantity_on_hand} {selectedPart.unit}
                            {selectedPart.quantity_on_hand === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground tracking-wide mb-2 uppercase">
                          Quantity Used
                        </h3>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          >
                            −
                          </Button>
                          <input
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                            className="flex-1 text-center border border-input rounded-md h-9 bg-background"
                          />
                          <Button type="button" variant="outline" size="icon" onClick={() => setQuantity((q) => q + 1)}>
                            +
                          </Button>
                        </div>
                      </div>

                      {isOverStock ? (
                        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-sm space-y-1">
                          <p className="font-medium">
                            Only {selectedPart.quantity_on_hand} in stock — logging {quantity} will leave this
                            order Awaiting Parts until restocked.
                          </p>
                          <div className="flex justify-between font-semibold pt-1">
                            <span>Subtotal</span>
                            <span>{formatPeso(subtotal)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex justify-between">
                          <span className="text-sm font-medium text-primary">Subtotal</span>
                          <span className="font-semibold text-primary">{formatPeso(subtotal)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {actionError && (
                    <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      {actionError}
                    </p>
                  )}

                  {selectedPart && (
                    <Button
                      type="button"
                      disabled={submitting}
                      className={`w-full ${isOverStock ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
                      onClick={handleLogPart}
                    >
                      {submitting
                        ? "Logging..."
                        : isOverStock
                        ? "Log Part — Order Will Move to Awaiting Parts"
                        : "Log Part & Deduct from Inventory"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}

          {eligibleOrders.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No orders currently eligible for parts logging.
            </p>
          )}

          {eligibleOrders.length > 0 && !selectedOrderId && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <ArrowUpDown className="w-5 h-5" />
              <p className="text-sm">Select a repair order to log parts</p>
            </div>
          )}
        </div>

        {/* RIGHT: order-specific log + inventory snapshot. Sticky, capped to viewport height. */}
        <div className="space-y-4 sticky top-[73px] max-h-[calc(100vh-97px)] overflow-y-auto pr-1">
          {selectedOrder && (
            <div className="border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Parts Logged on {selectedOrder.id}
              </h3>
              {visibleLogged.length > 0 ? (
                <div className="space-y-2">
                  {visibleLogged.map((row) => (
                    <div key={row.order_part_id} className="flex items-start justify-between gap-2 text-sm">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium">{row.part_name}</p>
                          <Badge variant="secondary" className={STATUS_BADGE_STYLE[row.status]}>
                            {STATUS_LABEL[row.status] ?? row.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Qty {row.quantity_used}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-medium">{formatPeso(row.unit_price * row.quantity_used)}</span>
                        {confirmingCancelId === row.order_part_id ? (
                          <div className="flex items-center gap-1 text-xs">
                            <button
                              type="button"
                              onClick={() => handleCancelPart(row)}
                              className="text-destructive font-medium hover:underline"
                            >
                              Cancel part
                            </button>
                            <span className="text-muted-foreground">·</span>
                            <button
                              type="button"
                              onClick={() => setConfirmingCancelId(null)}
                              className="text-muted-foreground hover:underline"
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Cancel ${row.part_name}`}
                            title="Cancel this logged part"
                            onClick={() => setConfirmingCancelId(row.order_part_id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
                    <span>Parts Total</span>
                    <span>{formatPeso(partsTotal)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No parts logged on this order yet.</p>
              )}
            </div>
          )}

          <div className="border border-border rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
              Inventory Snapshot
            </h3>
            {inventory.map((part) => {
              const low = part.quantity_on_hand <= part.reorder_level;
              return (
                <div key={part.part_id} className="flex items-center justify-between text-sm py-1">
                  <span>{part.part_name}</span>
                  <Badge
                    variant="secondary"
                    className={low ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : "bg-green-100 text-green-800 hover:bg-green-100"}
                  >
                    {part.quantity_on_hand} left
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}