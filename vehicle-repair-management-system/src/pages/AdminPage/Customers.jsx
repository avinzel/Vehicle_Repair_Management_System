"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CustomerFormDialog } from "@/components/dialogs/CustomerFormDialog";
import { FilterBar } from "@/components/OrderSearchFilter";

const API = "http://localhost:8000/api.php";

// Row shape follows GET action=customers (Customer Module API, section 1).
function normalizeCustomer(raw) {
  return {
    id: raw.customer_id,
    formattedId: raw.formatted_customer_id ?? `C-${String(raw.customer_id).padStart(3, "0")}`,
    name: raw.full_name ?? [raw.first_name, raw.last_name].filter(Boolean).join(" ") ?? "—",
    firstName: raw.first_name ?? "",
    middleName: raw.middle_name ?? "",
    lastName: raw.last_name ?? "",
    phone: raw.contact_no ?? "",
    email: raw.email ?? "",
    status: raw.status ?? "ACTIVE",
    vehicleCount: Number(raw.vehicle_count ?? 0),
    lastVisit: raw.last_visit ?? null,
  };
}

function vehicleLabel(count) {
  if (count === 0) return "No vehicles";
  return `${count} vehicle${count === 1 ? "" : "s"}`;
}

async function request(url, options) {
  const res = await fetch(url, { credentials: "include", ...options });
  const json = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? json.message ?? `Request failed (HTTP ${res.status})`);
  return json;
}

// Endpoints (Customer Module API):
//   GET    action=customers[&search=]            -> { data: [...] }
//   GET    action=customers&customer_id=X        -> { data: { customer, vehicles, repair_history } }
//   PUT    action=customers&customer_id=X        { first_name, last_name, contact_no, ..., vehicles }
//   DELETE action=customers&customer_id=X        (soft delete / deactivate)
// No create here: admins don't add customers (intake does).
export function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState("");
  // Skip the debounce on the very first load.
  const firstLoad = useRef(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [deactivating, setDeactivating] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const getCustomers = useCallback(async (query = "", signal) => {
    setLoadError(null);
    try {
      const q = query.trim();
      const json = await request(
        `${API}?action=customers${q ? `&search=${encodeURIComponent(q)}` : ""}`,
        { signal }
      );
      const rows = json.data ?? [];
      setCustomers(rows.map(normalizeCustomer));
    } catch (err) {
      if (err.name !== "AbortError") setLoadError(err.message || "Failed to load customers");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  // Server-side search (it also matches plate / make / model), debounced.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => getCustomers(search, controller.signal),
      firstLoad.current ? 0 : 300
    );
    firstLoad.current = false;
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, getCustomers]);

  async function loadDetails(customerId) {
    const json = await request(`${API}?action=customers&customer_id=${encodeURIComponent(customerId)}`);
    return json.data;
  }

  function openEdit(customer) {
    setEditing(customer);
    setFormOpen(true);
  }

  async function handleSubmit(payload) {
    await request(`${API}?action=customers&customer_id=${encodeURIComponent(editing.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await getCustomers(search);
  }

  async function handleDeactivate() {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await request(`${API}?action=customers&customer_id=${encodeURIComponent(deactivating.id)}`, {
        method: "DELETE",
      });
      setDeactivating(null);
      await getCustomers(search);
    } catch (err) {
      // 409 when the customer still has a repair order that isn't FULFILLED/CANCELLED
      setDeleteError(err.message || "Failed to deactivate customer");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="w-full">
      <div className="sticky top-[73px] z-10 bg-card -mx-6 -mt-6 border-b border-border">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search by name, phone, email, or vehicle..."
          showTabs={false}
        />
      </div>

      <div className="pt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-bold pb-1">Customer Directory</CardTitle>
            <CardDescription>
              {customers.length} customer{customers.length === 1 ? "" : "s"}
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
                  <TableHead className="text-sm font-medium text-tertiary">ID</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Customer</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Contact</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Vehicles</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Last Visit</TableHead>
                  <TableHead className="text-right text-sm font-medium text-tertiary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs text-muted-foreground">{c.formattedId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                          {c.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{c.phone || "—"}</p>
                      <p className="text-xs text-muted-foreground">{c.email || "—"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{vehicleLabel(c.vehicleCount)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.lastVisit ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${c.name}`}
                          className="hover:text-muted-foreground"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Deactivate ${c.name}`}
                          className="hover:text-destructive"
                          onClick={() => {
                            setDeleteError(null);
                            setDeactivating(c);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {!loading && customers.length === 0 && !loadError && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                      {search.trim() ? "No customers match your search." : "No customers yet."}
                    </TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                      Loading customers...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <CustomerFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          customer={editing}
          loadDetails={loadDetails}
          onSubmit={handleSubmit}
        />

        <ConfirmDialog
          open={!!deactivating}
          onOpenChange={(open) => !open && !deleteBusy && setDeactivating(null)}
          title="Deactivate customer?"
          description={`"${deactivating?.name ?? "This customer"}" will be deactivated and hidden from the customer list. Their vehicles and repair history are kept. This isn't allowed while they still have an open repair order.`}
          confirmLabel="Deactivate"
          destructive
          loading={deleteBusy}
          error={deleteError}
          onConfirm={handleDeactivate}
        />
      </div>
    </div>
  );
}