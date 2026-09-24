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

// TODO: placeholder mock data. Swap for real fetches once endpoints
// exist — see API_DOCUMENTATION.md:
//   GET  action=repair-orders&category=active   (filter client-side, or
//        ask backend for a category=assigned-loggable variant)
//   GET  action=parts&status=ALL
//   POST action=repair-orders&post-method=log-part
//   (no cancel endpoint yet — see sp_cancel_logged_part discussion; the
//   button below is wired to local state only until that exists)
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
  {
    id: "RO-2514",
    rawId: 2514,
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
  {
    id: "RO-8794",
    rawId: 8794,
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

const MOCK_PARTS_INVENTORY = [
  { part_id: 1, part_name: "Engine Oil (1L)", unit: "liter", unit_price: 380, quantity_on_hand: 48, reorder_level: 10 },
  { part_id: 2, part_name: "Brake Pads (set)", unit: "set", unit_price: 1200, quantity_on_hand: 12, reorder_level: 5 },
  { part_id: 3, part_name: "Air Filter", unit: "pc", unit_price: 380, quantity_on_hand: 20, reorder_level: 8 },
  { part_id: 4, part_name: "Spark Plugs (set of 4)", unit: "set", unit_price: 950, quantity_on_hand: 18, reorder_level: 6 },
  { part_id: 5, part_name: "Car Battery (12V)", unit: "pc", unit_price: 3800, quantity_on_hand: 8, reorder_level: 5 },
  { part_id: 6, part_name: "Wiper Blade (pair)", unit: "pair", unit_price: 650, quantity_on_hand: 22, reorder_level: 8 },
  { part_id: 7, part_name: "Coolant (1L)", unit: "liter", unit_price: 280, quantity_on_hand: 30, reorder_level: 10 },
  { part_id: 8, part_name: "Timing Belt", unit: "pc", unit_price: 1850, quantity_on_hand: 6, reorder_level: 5 },
];

const MOCK_LOGGED_PARTS = {
  1050: [
    { order_part_id: 101, part_id: 3, part_name: "Air Filter", quantity_used: 1, unit_price: 380, status: "ISSUED", loggedBy: "Ben Reyes" },
  ],
};

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

export function PartsLogger({ currentUserName = "Ben Reyes" }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loggedPartsByOrder, setLoggedPartsByOrder] = useState({});

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [confirmingCancelId, setConfirmingCancelId] = useState(null);

  const fetchPageData = useCallback(async () => {
    // TODO: backend not built yet — see log-part / parts endpoints above.
    setEligibleOrders(MOCK_ELIGIBLE_ORDERS);
    setInventory(MOCK_PARTS_INVENTORY);
    setLoggedPartsByOrder(MOCK_LOGGED_PARTS);
  }, []);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

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

  function handleLogPart() {
    if (!selectedOrder || !selectedPart || quantity < 1) return;

    const willBePending = isOverStock;
    const newRow = {
      order_part_id: Date.now(), // TODO: real id comes back from the backend once log-part exists
      part_id: selectedPart.part_id,
      part_name: selectedPart.part_name,
      quantity_used: quantity,
      unit_price: selectedPart.unit_price,
      status: willBePending ? "PENDING_PARTS" : "ISSUED",
      loggedBy: currentUserName,
    };

    setLoggedPartsByOrder((prev) => ({
      ...prev,
      [selectedOrder.rawId]: [...(prev[selectedOrder.rawId] ?? []), newRow],
    }));

    // Mirrors sp_log_part: only deduct stock when it's actually available.
    if (!willBePending) {
      setInventory((prev) =>
        prev.map((p) =>
          p.part_id === selectedPart.part_id
            ? { ...p, quantity_on_hand: p.quantity_on_hand - quantity }
            : p
        )
      );
    } else {
      // Mirrors the order flipping to AWAITING_PARTS automatically.
      setEligibleOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrder.id
            ? { ...o, status: "AWAITING_PARTS", statusLabel: "Awaiting Parts" }
            : o
        )
      );
    }

    resetPartSelection();
  }

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
      <div className="px-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* LEFT: order list, with the logging form expanding inline right
            under whichever card is selected — not below the whole list,
            so picking an order lower down doesn't require scrolling past
            every card above it to reach the form. */}
        <div className="space-y-3">
            <div className="flex flex-row items-center justify-start gap-2 py-2 text-muted-foreground">
              <ArrowUpDown className="w-5 h-5" />
              <p className="text-sm">Select a repair order to log parts</p>
            </div>

          {eligibleOrders.map((order) => (
            <div key={order.id} className="space-y-3">
              <OrderCard
                order={order}
                isSelected={selectedOrderId === order.id}
                onClick={() => handleSelectOrder(order.id)}
              />

              {selectedOrderId === order.id && selectedOrder && (
                <div className="space-y-4 border border-border rounded-xl p-4" >
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground tracking-wide mb-2 uppercase">
                      Select Part from Inventory
                    </h3>
                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen} >
                      <PopoverTrigger asChild className="w-full">
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
        </div>

        {/* RIGHT: order-specific log + global inventory. Sticky so it
            stays in view while the left column scrolls through however
            many order cards there are — same top-[73px] header-offset
            convention as ActiveRepairOrder's sticky filter bar. Adjust
            the offset if this page's Header renders at a different
            height. */}
        <div className="space-y-4 sticky top-[80px]">
          {selectedOrder && (
            <div className="border border-border rounded-xl p-4 space-y-3 bg-card">
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
                            Qty {row.quantity_used} · by {row.loggedBy}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-medium">{formatPeso(row.unit_price * row.quantity_used)}</span>
                          {confirmingCancelId === row.order_part_id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="text-xs text-destructive underline"
                                onClick={() => handleCancelPart(row)}
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                className="text-xs text-muted-foreground underline"
                                onClick={() => setConfirmingCancelId(null)}
                              >
                                Keep
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Cancel ${row.part_name}`}
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setConfirmingCancelId(row.order_part_id)}
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

          <div className="border border-border rounded-xl p-4 space-y-2 bg-card">
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