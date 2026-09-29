"use client"

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
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
import { normalizeOrder } from "@/utils/normalizeOrder";

// Order picker is STILL MOCKED — deliberately deferred. It's blocked on
// the same `category=assigned` backend work we agreed to build later
// (mechanic-scoped order list with real per-order position data). Come
// back here once that endpoint exists and swap this for a real fetch,
// same pattern as fetchInventory/fetchLoggedParts below.
const MOCK_ELIGIBLE_ORDERS = [
  {
    id: "RO-1050",
    rawId: 1050,
    status: "IN_PROGRESS",
    statusLabel: "In Progress",
    customer: "Grace Tan",
    vehicle: "Honda Civic 2022",
    plate: "STU-3344",
    vehicleType: "Car",
    date: "Aug 25, 2026",
    team: [
      { id: "u1", name: "Ramon Cruz", role: "Diagnostician" },
      { id: "u2", name: "Ben Reyes", role: "Lead Mechanic" },
      { id: "u3", name: "Leo Santos", role: "Assistant" },
    ],
  },
];

// Inventory and per-order logged parts are REAL endpoints
// (GET action=parts&status=ALL, GET category=parts-by-order&order_id=X —
// both routed in api.php), but I don't have PartController.php or
// getPartsByRepairOrder()'s exact response shape, so these normalizers
// are defensive/tolerant guesses, same situation as getAvailableMechanics
// before its real shape was confirmed. Test against real responses and
// tighten these once confirmed.

function formatPeso(amount) {
  return `₱${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: amount % 1 === 0 ? 0 : 2 })}`;
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loggedPartsByOrder, setLoggedPartsByOrder] = useState({});

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [confirmingCancelId, setConfirmingCancelId] = useState(null);

  const fetchEligibleOrders = useCallback(async () => {
    // TODO: still mocked — see comment above MOCK_ELIGIBLE_ORDERS.
    setEligibleOrders(MOCK_ELIGIBLE_ORDERS);
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:8000/api.php?action=parts&status=ALL`, {
        credentials: "include",
      });
      const json = await response.json();
      if (Array.isArray(json.data)) {
        setInventory(json.data.map(normalizeOrder));
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
        `http://localhost:8000/api.php?action=repair-orders&category=parts-by-order&order_id=${encodeURIComponent(rawOrderId)}`,
        { credentials: "include" }
      );
      const json = await response.json();
      const rows = Array.isArray(json.data) ? json.data : [];
      setLoggedPartsByOrder((prev) => ({ ...prev, [rawOrderId]: rows.map(normalizeOrder) }));
    } catch (err) {
      console.error("Failed to fetch logged parts for order", rawOrderId, err);
    }
  }, []);

  useEffect(() => {
    fetchEligibleOrders();
    fetchInventory();
  }, [fetchEligibleOrders, fetchInventory]);

  // Fetch this order's logged parts the moment it's selected — the list
  // endpoint doesn't include them, so each order's parts only load once
  // you actually pick that card.
  useEffect(() => {
    if (selectedOrderId == null) return;
    const order = eligibleOrders.find((o) => o.id === selectedOrderId);
    if (order?.rawId != null) fetchLoggedParts(order.rawId);
  }, [selectedOrderId, eligibleOrders, fetchLoggedParts]);

  // Redirect-and-preselect: "+ Log Parts Used" on an order's drawer links
  // here with ?order_id=<rawId>, same convention as the Diagnostic Log
  // redirect.
  useEffect(() => {
    const paramOrderId = searchParams.get("order_id");
    if (paramOrderId && eligibleOrders.length > 0) {
      const match = eligibleOrders.find((o) => String(o.rawId) === String(paramOrderId));
      if (match) setSelectedOrderId(match.id);
      setSearchParams({}, { replace: true });
    }
  }, [eligibleOrders, searchParams, setSearchParams]);

  const selectedOrder = eligibleOrders.find((o) => o.id === selectedOrderId) ?? null;
  const selectedPart = inventory.find((p) => p.part_id === selectedPartId) ?? null;
  const loggedForSelectedOrder = selectedOrder ? loggedPartsByOrder[selectedOrder.rawId] ?? [] : [];

  const isOverStock = selectedPart ? quantity > selectedPart.quantity_on_hand : false;
  const subtotal = selectedPart ? selectedPart.unit_price * quantity : 0;

  function resetPartSelection() {
    setSelectedPartId(null);
    setQuantity(1);
  }

  function handleSelectOrder(orderId) {
    setSelectedOrderId(orderId);
    resetPartSelection();
  }

  async function handleLogPart() {
    if (!selectedOrder || !selectedPart || quantity < 1) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api.php?action=repair-orders&post-method=log-part`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: selectedOrder.rawId,
            part_id: selectedPart.part_id,
            quantity,
          }),
        }
      );
      const json = await response.json();

      if (json.status === "success") {
        // Don't guess the outcome locally (whether it went ISSUED or
        // PENDING_PARTS, whether stock actually moved) — sp_log_part
        // decides that server-side. Just refetch both sources of truth.
        await Promise.all([fetchInventory(), fetchLoggedParts(selectedOrder.rawId)]);
        resetPartSelection();
      } else {
        console.error("Failed to log part:", json.error ?? json);
      }
    } catch (err) {
      console.error("Failed to log part:", err);
    }
  }

  // STILL LOCAL-ONLY: no backend endpoint exists for this at all (see the
  // sp_cancel_logged_part discussion — never built). This used to be
  // harmless when the whole page was mocked, but now that handleLogPart
  // triggers real refetches, a "cancelled" row here would silently
  // reappear the next time inventory/logged-parts gets refetched, since
  // nothing was actually cancelled server-side. The X button below is
  // disabled rather than left looking functional — flip it back on once
  // a real cancel endpoint exists.
  function handleCancelPart(row) {
    if (!selectedOrder) return;

    const remaining = (loggedPartsByOrder[selectedOrder.rawId] ?? []).filter(
      (r) => r.order_part_id !== row.order_part_id
    );

    setLoggedPartsByOrder((prev) => ({ ...prev, [selectedOrder.rawId]: remaining }));

    // Mirrors the proposed sp_cancel_logged_part: give stock back only if
    // it was actually deducted (ISSUED); PENDING_PARTS never touched stock.
    if (row.status === "ISSUED") {
      setInventory((prev) =>
        prev.map((p) =>
          p.part_id === row.part_id
            ? { ...p, quantity_on_hand: p.quantity_on_hand + row.quantity_used }
            : p
        )
      );
    }

    // Mirrors sp_restock_and_fulfill's reversion check: if that was the
    // last PENDING_PARTS row for this order, drop it back to IN_PROGRESS.
    const stillPending = remaining.some((r) => r.status === "PENDING_PARTS");
    if (row.status === "PENDING_PARTS" && !stillPending) {
      setEligibleOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id ? { ...o, status: "IN_PROGRESS", statusLabel: "In Progress" } : o
        )
      );
    }

    setConfirmingCancelId(null);
  }

  const partsTotal = loggedForSelectedOrder
    .filter((r) => r.status !== "CANCELLED")
    .reduce((sum, r) => sum + r.unit_price * r.quantity_used, 0);

  return (
    <div className="w-full">
      <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* LEFT: order list, with the logging form expanding inline right
            under whichever card is selected — not below the whole list,
            so picking an order lower down doesn't require scrolling past
            every card above it to reach the form. */}
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

                      <Button
                        type="button"
                        className={`w-full ${isOverStock ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
                        onClick={handleLogPart}
                      >
                        {isOverStock ? "Log Part — Order Will Move to Awaiting Parts" : "Log Part & Deduct from Inventory"}
                      </Button>
                    </>
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

        {/* RIGHT: order-specific log + global inventory. Sticky so it
            stays in view while the left column scrolls through however
            many order cards there are — same top-[73px] header-offset
            convention as ActiveRepairOrder's sticky filter bar.
            max-h + overflow-y-auto is required, not optional: a sticky
            element only has room to "float" while its parent (the grid
            row) is taller than it. As Parts Logged grows, this column's
            own height grows too — once it exceeds the left column's
            height, the grid row height becomes driven by this column
            itself, leaving no slack to stick within, and it falls back
            to scrolling normally with the page. Capping this column at
            the viewport height and scrolling its own content instead
            guarantees it never outgrows that slack, regardless of how
            many parts get logged. Adjust the offset if this page's
            Header renders at a different height. */}
        <div className="space-y-4 sticky top-[73px] max-h-[calc(100vh-97px)] overflow-y-auto pr-1">
          {selectedOrder && (
            <div className="border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Parts Logged on {selectedOrder.id}
              </h3>
              {loggedForSelectedOrder.filter((r) => r.status !== "CANCELLED").length > 0 ? (
                <div className="space-y-2">
                  {loggedForSelectedOrder
                    .filter((r) => r.status !== "CANCELLED")
                    .map((row) => (
                      <div key={row.order_part_id} className="flex items-start justify-between gap-2 text-sm">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium">{row.part_name}</p>
                            <Badge variant="secondary" className={STATUS_BADGE_STYLE[row.status]}>
                              {STATUS_LABEL[row.status]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {[`Qty ${row.quantity_used}`, row.loggedBy ? `by ${row.loggedBy}` : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-medium">{formatPeso(row.unit_price * row.quantity_used)}</span>
                          <button
                            type="button"
                            disabled
                            aria-label={`Cancel ${row.part_name}`}
                            title="Cancelling a logged part isn't available yet — no backend endpoint exists for it."
                            className="text-muted-foreground/40 cursor-not-allowed"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
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