"use client"

import { useState, useEffect } from "react";
import { OrderFilterBar } from "@/components/OrderSearchFilter";
import { DetailDrawer } from "@/components/DetailDrawer";
import { CustomerDetail } from "@/components/CustomerDetail";
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
import { normalizeCustomerRow } from "@/utils/normalizeCustomer";

const API = "http://localhost:8000/api.php";

function vehicleLabel(count) {
  if (count === 0) return "No vehicles";
  return `${count} vehicle${count === 1 ? "" : "s"}`;
}

export function CustomerRecords() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep the selected row itself (not just its id) so the drawer stays open
  // even if a later search filters that customer out of the table.
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Server-side search (the SP also matches plate/make/model, which the
  // list row doesn't carry), debounced so typing doesn't fire a request
  // per keystroke.
  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const q = search.trim();
        const url = `${API}?action=customers${q ? `&search=${encodeURIComponent(q)}` : ""}`;
        const response = await fetch(url, { credentials: "include", signal: controller.signal });
        const json = await response.json();

        if (json.status === "success" && Array.isArray(json.data)) {
          setCustomers(json.data.map(normalizeCustomerRow));
        } else {
          setError(json.error ?? "Failed to load customers");
        }
      } catch (err) {
        if (err.name !== "AbortError") setError("Failed to load customers");
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
      {/* Full-bleed sticky filter bar, same treatment as Active Repair Orders. */}
      <div className="sticky top-[73px] z-10 bg-card -mx-6 -mt-6 border-b border-border">
        <OrderFilterBar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search by name, phone, or vehicle..."
          showTabs={false}
        />
      </div>

      <div className="p-6">
        <Card className="py-0 gap-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6 text-sm font-semibold tracking-wide text-muted-foreground">Customer</TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-muted-foreground">Contact</TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-muted-foreground">Vehicles</TableHead>
                <TableHead className="text-sm font-semibold tracking-wide text-muted-foreground">Last Visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const isSelected = selectedCustomer?.rawId === customer.rawId;
                return (
                  <TableRow
                    key={customer.rawId}
                    tabIndex={0}
                    data-state={isSelected ? "selected" : undefined}
                    onClick={() => setSelectedCustomer(customer)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedCustomer(customer);
                      }
                    }}
                    className="cursor-pointer data-[state=selected]:bg-primary/10"
                  >
                    <TableCell className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                          {customer.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{customer.phone ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{customer.email ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{vehicleLabel(customer.vehicleCount)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer.lastVisit ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}

              {!loading && customers.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    {error ?? "No customers match your search."}
                  </TableCell>
                </TableRow>
              )}

              {loading && customers.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    Loading customers...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <DetailDrawer
        open={!!selectedCustomer}
        onOpenChange={(open) => {
          if (!open) setSelectedCustomer(null);
        }}
      >
        <CustomerDetail customer={selectedCustomer} />
      </DetailDrawer>
    </div>
  );
}