"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useOutletContext } from "react-router";
import { Plus, Pencil, Trash2, PackagePlus, RotateCcw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PartFormDialog, unitLabel } from "@/components/dialogs/PartFormDialog";
import { RestockPartDialog } from "@/components/dialogs/RestockPartDialog";
import { FilterBar, matchesSearch } from "@/components/OrderSearchFilter";
import { normalizePart } from "@/utils/normalizeOrder";

const API = "http://localhost:8000/api.php";

const STOCK_LEVELS = {
  LOW: { label: "Low stock", cls: "border-red-200 bg-red-100 text-red-800 hover:bg-red-100" },
  MODERATE: { label: "Moderate", cls: "border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100" },
  IN_STOCK: { label: "In stock", cls: "border-green-200 bg-green-100 text-green-800 hover:bg-green-100" },
};

function getStockLevel(part) {
  if (part.quantity_on_hand <= 5) return "LOW";
  if (part.quantity_on_hand <= 20) return "MODERATE";
  return "IN_STOCK";
}

const PILL_FILTERS = [
  { label: "All", kind: "all" },
  // stock level
  { label: STOCK_LEVELS.IN_STOCK.label, kind: "stock" },
  { label: STOCK_LEVELS.MODERATE.label, kind: "stock" },
  { label: STOCK_LEVELS.LOW.label, kind: "stock" },
  // vehicle type
  { label: "Car", kind: "vehicle" },
  { label: "Motorcycle", kind: "vehicle" },
  { label: "Tricycle", kind: "vehicle" },
];

const FILTER_TABS = PILL_FILTERS.map((f) => f.label);
function matchesPill(part, label) {
  const pill = PILL_FILTERS.find((f) => f.label === label);
  if (!pill || pill.kind === "all") return true;

  if (pill.kind === "stock") {
    return STOCK_LEVELS[getStockLevel(part)].label === label;
  }

  // vehicle: vehicle_types may be one or several ("CAR", "Car, Motorcycle").
  // Parts marked "All"/"Universal" fit every vehicle.
  const tokens = String(part.vehicle_types ?? "")
    .toLowerCase()
    .split(/[,/|]/)
    .map((t) => t.trim());
  return (
    tokens.includes(label.toLowerCase()) ||
    tokens.includes("all") ||
    tokens.includes("universal")
  );
}

function formatPeso(amount) {
  const n = Number(amount) || 0;
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

async function request(url, options) {
  const res = await fetch(url, { credentials: "include", ...options });
  const json = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? json.message ?? `Request failed (HTTP ${res.status})`);
  return json;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export function PartsInventory() {
  const { setOutOfStockCount } = useOutletContext() ?? {};
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const partsRequestId = useRef(0);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [inventoryStatus, setInventoryStatus] = useState("ACTIVE");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // part row or null (= add)

  const [restocking, setRestocking] = useState(null);
  const [reactivatingId, setReactivatingId] = useState(null);

  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  useEffect(() => {
    if (!actionSuccess) return undefined;

    const timeoutId = window.setTimeout(() => setActionSuccess(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [actionSuccess]);

  const getParts = useCallback(async () => {
    const requestId = ++partsRequestId.current;
    setLoadError(null);
    try {
      const json = await request(`${API}?action=parts&status=${inventoryStatus}`);
      const rows = Array.isArray(json.data) ? json.data : [];
      const normalizedParts = rows.map(normalizePart);
      if (requestId === partsRequestId.current) {
        setParts(normalizedParts);
      }
      if (inventoryStatus === "ACTIVE" && requestId === partsRequestId.current) {
        setOutOfStockCount?.(
          normalizedParts.filter((part) => part.quantity_on_hand <= 5).length
        );
      }
    } catch (err) {
      if (requestId === partsRequestId.current) {
        setLoadError(err.message || "Failed to load parts");
      }
    } finally {
      if (requestId === partsRequestId.current) {
        setLoading(false);
      }
    }
  }, [inventoryStatus, setOutOfStockCount]);

  useEffect(() => {
    getParts();
  }, [getParts]);

  const lowStockCount = useMemo(
    () => parts.filter((p) => getStockLevel(p) === "LOW").length,
    [parts]
  );


  const filteredParts = useMemo(
    () =>
      parts.filter(
        (p) =>
          matchesPill(p, activeFilter) &&
          matchesSearch(search, p.part_name, p.part_code, unitLabel(p.unit), p.vehicle_types)
      ),
    [parts, search, activeFilter]
  );

  function openAdd() {
    setEditing(null);
    setActionSuccess(null);
    setFormOpen(true);
  }

  function openEdit(part) {
    setEditing(part);
    setActionSuccess(null);
    setFormOpen(true);
  }

  async function handleSubmit(payload) {
    setLoadError(null);
    if (editing) {
      await request(`${API}?action=parts`, {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({ ...payload, part_id: editing.part_id }),
      });
    } else {
      await request(`${API}?action=parts`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });
    }
    await getParts();
    setActionSuccess(`Part ${editing ? "updated" : "added"} successfully.`);
  }

  async function handleRestock(quantity) {
    setLoadError(null);
    await request(`${API}?action=parts&post-method=restock`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ part_id: restocking.part_id, quantity }),
    });
    await getParts();
  }

  async function handleDelete() {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const deletedPart = deleting;
      await request(`${API}?action=parts`, {
        method: "DELETE",
        headers: JSON_HEADERS,
        body: JSON.stringify({ part_id: deleting.part_id }),
      });
      setDeleting(null);
      setLoadError(null);
      setParts((currentParts) =>
        currentParts.filter((part) => part.part_id !== deletedPart.part_id)
      );
      await getParts();
      setParts((currentParts) =>
        currentParts.filter((part) => part.part_id !== deletedPart.part_id)
      );
      setActionSuccess(`${deletedPart.part_name} was discontinued successfully.`);
    } catch (err) {
      setDeleteError(err.message || "Failed to remove part");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleReactivate(part) {
    setReactivatingId(part.part_id);
    setLoadError(null);
    setActionSuccess(null);
    try {
      await request(`${API}?action=parts`, {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({ part_id: part.part_id, status: "ACTIVE" }),
      });
      await getParts();
      setActionSuccess(`${part.part_name} was activated successfully.`);
      try {
        const activeJson = await request(`${API}?action=parts&status=ACTIVE`);
        const activeParts = Array.isArray(activeJson.data) ? activeJson.data.map(normalizePart) : [];
        setOutOfStockCount?.(
          activeParts.filter((activePart) => activePart.quantity_on_hand <= 5).length
        );
      } catch (err) {
        console.error("Failed to refresh active parts stock count:", err);
        setLoadError("The part was activated, but the stock summary could not be refreshed.");
      }
    } catch (err) {
      setLoadError(err.message || "Failed to activate part");
    } finally {
      setReactivatingId(null);
    }
  }

  return (
    <div className="w-full">
      <div className="sticky top-[73px] z-10 bg-card -mx-6 -mt-6 border-b border-border">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={activeFilter}
          onStatusFilterChange={setActiveFilter}
          placeholder="Search by part ID, name, vehicle types ,or unit..."
          tabs={FILTER_TABS}
        />
      </div>

      <div className="pt-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-bold pb-1">Parts Inventory</CardTitle>
              <CardDescription>
                {parts.length} part{parts.length === 1 ? "" : "s"} · {lowStockCount} low stock
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div role="group" aria-label="Filter parts by status" className="flex items-center gap-1">
                {[
                  { label: "Active", value: "ACTIVE" },
                  { label: "Inactive", value: "INACTIVE" },
                ].map((filter) => (
                  <Button
                    key={filter.value}
                    type="button"
                    size="sm"
                    variant={inventoryStatus === filter.value ? "default" : "outline"}
                    aria-pressed={inventoryStatus === filter.value}
                    onClick={() => {
                      setLoading(true);
                      setLoadError(null);
                      if (inventoryStatus === filter.value) {
                        getParts();
                      } else {
                        setInventoryStatus(filter.value);
                      }
                    }}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
              <Button onClick={openAdd} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Add Part
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {actionSuccess && (
              <p role="status" className="mb-4 text-sm text-green-800 bg-green-100 border border-green-200 rounded-lg p-3">
                {actionSuccess}
              </p>
            )}

            {loadError && (
              <p role="alert" className="mb-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                {loadError}
              </p>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm font-medium text-tertiary">Part ID</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Name</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Category</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Vehicle Type</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Unit</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary text-center">Qty on Hand</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Unit Cost</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Stock Level</TableHead>
                  <TableHead className="text-right text-sm font-medium text-tertiary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part) => {
                  const level = STOCK_LEVELS[getStockLevel(part)];
                  return (
                    <TableRow key={part.part_id}>
                      <TableCell className="text-xs text-muted-foreground">{part.part_code}</TableCell>
                      <TableCell className="font-medium">{part.part_name}</TableCell>
                      <TableCell className="font-medium">{part.category}</TableCell>
                      <TableCell className="font-medium">{part.vehicle_types}</TableCell>
                      <TableCell className="text-muted-foreground">{unitLabel(part.unit)}</TableCell>
                      <TableCell className="font-medium text-center">{part.quantity_on_hand}</TableCell>
                      <TableCell className="text-muted-foreground">{formatPeso(part.unit_price)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={level.cls}>
                          {level.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {inventoryStatus === "INACTIVE" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`Activate ${part.part_name}`}
                              disabled={reactivatingId === part.part_id}
                              onClick={() => handleReactivate(part)}
                            >
                              <RotateCcw className="w-4 h-4" />
                              {reactivatingId === part.part_id ? "Activating..." : "Activate"}
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Restock ${part.part_name}`}
                                className="hover:text-muted-foreground"
                                onClick={() => setRestocking(part)}
                              >
                                <PackagePlus className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Edit ${part.part_name}`}
                                className="hover:text-muted-foreground"
                                onClick={() => openEdit(part)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Remove ${part.part_name}`}
                                className="hover:text-destructive"
                                onClick={() => {
                                  setDeleteError(null);
                                  setActionSuccess(null);
                                  setDeleting(part);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {!loading && parts.length > 0 && filteredParts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                      No parts match your filters.
                    </TableCell>
                  </TableRow>
                )}
                {!loading && parts.length === 0 && !loadError && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                      {inventoryStatus === "INACTIVE"
                        ? "No inactive parts."
                        : "No parts yet. Add one to start tracking stock."}
                    </TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                      Loading parts...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <PartFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          part={editing}
          onSubmit={handleSubmit}
        />

        <RestockPartDialog
          open={!!restocking}
          onOpenChange={(open) => !open && setRestocking(null)}
          part={restocking}
          onSubmit={handleRestock}
        />

        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && !deleteBusy && setDeleting(null)}
          title="Remove part?"
          description={`${deleting?.part_name ?? "This part"} will be discontinued and can no longer be logged on repair orders. Past orders keep their history.`}
          confirmLabel="Remove"
          destructive
          loading={deleteBusy}
          error={deleteError}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}