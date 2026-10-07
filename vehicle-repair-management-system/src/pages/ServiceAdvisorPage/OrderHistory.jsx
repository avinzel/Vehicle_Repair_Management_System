"use client"

import { useState, useEffect } from "react";
import { OrderFilterBar } from "@/components/OrderSearchFilter";
import { DetailDrawer } from "@/components/DetailDrawer";
import { OrderHistoryDetail } from "@/components/OrderHistoryDetail";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

const API = "http://localhost:8000/api.php";

// sp_get_order_history columns -> the shape this page (and the drawer) reads.
// Kept local because this is the only consumer; move to utils/ if another
// page ever needs it.
function normalizeHistoryRow(raw) {
  return {
    id: raw.order_id, // "RO-9"
    rawId: raw.raw_order_id, // 9
    customer: raw.customer_name,
    vehicle: [raw.vehicle_brand, raw.vehicle_model].filter(Boolean).join(" "),
    plateNumber: raw.plate_number,
    vehicleType: raw.vehicle_type,
    completedDate: raw.completed_date,
    mechanics: raw.mechanics_list,
    total: Number(raw.raw_total_paid ?? 0),
    totalLabel: raw.formatted_total_paid,
  };
}

export function OrderHistory() {
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep the selected row itself (not just its id) so the drawer stays open
  // even if a later search filters that order out of the table.
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Server-side search (the SP also matches plate, make/model and mechanic
  // names), debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const q = search.trim();
        const url = `${API}?action=repair-orders&category=history${q ? `&search=${encodeURIComponent(q)}` : ""}`;
        const response = await fetch(url, { credentials: "include", signal: controller.signal });
        const json = await response.json();

        if (json.status === "success" && Array.isArray(json.data)) {
          setOrders(json.data.map(normalizeHistoryRow));
          setTotalRevenue(json.total_revenue ?? null);
        } else {
          setError(json.error ?? "Failed to load order history");
        }
      } catch (err) {
        if (err.name !== "AbortError") setError("Failed to load order history");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  return (
    <div className="w-full">
      {/* Full-bleed sticky filter bar, same treatment as Customer Records. */}
      <div className="sticky top-[73px] z-10 bg-card -mx-6 -mt-6 border-b border-border">
        <OrderFilterBar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search by order ID, customer, vehicle, plate, or mechanic..."
          showTabs={false}
        />
      </div>

      <div className="p-6 space-y-3">

        <Card className="py-0 gap-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6 text-sm font-semibold tracking-wide text-muted-foreground">Order</TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-muted-foreground">Customer</TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-muted-foreground">Vehicle</TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-muted-foreground">Mechanics</TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-muted-foreground">Completed</TableHead>
                <TableHead className="px-6 text-right text-sm font-semibold tracking-wide text-muted-foreground">Total Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const isSelected = selectedOrder?.rawId === order.rawId;
                return (
                  <TableRow
                    key={order.rawId}
                    tabIndex={0}
                    data-state={isSelected ? "selected" : undefined}
                    onClick={() => setSelectedOrder(order)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedOrder(order);
                      }
                    }}
                    className="cursor-pointer data-[state=selected]:bg-primary/10"
                  >
                    <TableCell className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{order.id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{order.customer}</TableCell>
                    <TableCell>
                      <p className="font-medium">{order.vehicle}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.plateNumber} · {order.vehicleType}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">
                      {order.mechanics}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{order.completedDate ?? "—"}</TableCell>
                    <TableCell className="px-6 text-right font-semibold">{order.totalLabel}</TableCell>
                  </TableRow>
                );
              })}

              {!loading && orders.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    {error ?? "No fulfilled orders match your search."}
                  </TableCell>
                </TableRow>
              )}

              {loading && orders.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Loading order history...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <DetailDrawer
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
        }}
      >
        <OrderHistoryDetail order={selectedOrder} />
      </DetailDrawer>
    </div>
  );
}