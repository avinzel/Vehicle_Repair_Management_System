"use client"

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Pencil, Trash2, PackagePlus  } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PartFormDialog, unitLabel } from "@/components/dialogs/PartFormDialog";
import { RestockPartDialog } from "@/components/dialogs/RestockPartDialog";

const API = "http://localhost:8000/api.php";

// Stock level is derived from each part's own reorder_level:
//   0 on hand            -> Out of Stock
//   <= reorder_level     -> Low
//   <= reorder_level * 2 -> Moderate
//   anything above       -> In Stock
// Change MODERATE_MULTIPLIER to widen/narrow the "Moderate" band.
const MODERATE_MULTIPLIER = 2;

const STOCK_LEVELS = {
  OUT: { label: "Out of Stock", cls: "bg-red-100 text-red-800 hover:bg-red-100" },
  LOW: { label: "Low", cls: "bg-red-100 text-red-800 hover:bg-red-100" },
  MODERATE: { label: "Moderate", cls: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  IN_STOCK: { label: "In Stock", cls: "bg-green-100 text-green-800 hover:bg-green-100" },
};

function getStockLevel(part) {
  if (part.quantity <= 0) return "OUT";
  if (part.quantity <= part.reorderLevel) return "LOW";
  if (part.quantity <= part.reorderLevel * MODERATE_MULTIPLIER) return "MODERATE";
  return "IN_STOCK";
}

// Row shape comes from sp_get_parts_inventory.
function normalizePart(raw) {
  const id = raw.part_id ?? raw.id;
  return {
    id,
    code: `P-${String(id).padStart(3, "0")}`,
    name: raw.part_name ?? raw.name ?? "—",
    unit: raw.unit ?? "pc",
    quantity: Number(raw.quantity_on_hand ?? 0),
    unitPrice: Number(raw.unit_price ?? 0),
    reorderLevel: Number(raw.reorder_level ?? 0),
  };
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
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // part row or null (= add)

  const [restocking, setRestocking] = useState(null);

  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // status=ACTIVE: removed parts are soft-deleted (DISCONTINUED) and
  // shouldn't show up in the admin list.
  const getParts = useCallback(async () => {
    setLoadError(null);
    try {
      const json = await request(`${API}?action=parts&status=ACTIVE`);
      const rows = Array.isArray(json.data) ? json.data : [];
      setParts(rows.map(normalizePart));
    } catch (err) {
      setLoadError(err.message || "Failed to load parts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getParts();
  }, [getParts]);

  const lowStockCount = useMemo(
    () => parts.filter((p) => ["LOW", "OUT"].includes(getStockLevel(p))).length,
    [parts]
  );

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(part) {
    setEditing(part);
    setFormOpen(true);
  }

  async function handleSubmit(payload) {
    if (editing) {
      await request(`${API}?action=parts`, {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({ ...payload, part_id: editing.id }),
      });
    } else {
      await request(`${API}?action=parts`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });
    }
    await getParts();
  }

  async function handleRestock(quantity) {
    await request(`${API}?action=parts&post-method=restock`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ part_id: restocking.id, quantity }),
    });
    await getParts();
  }

  async function handleDelete() {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await request(`${API}?action=parts`, {
        method: "DELETE",
        headers: JSON_HEADERS,
        body: JSON.stringify({ part_id: deleting.id }),
      });
      setDeleting(null);
      await getParts();
    } catch (err) {
      setDeleteError(err.message || "Failed to remove part");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-bold pb-1">Parts Inventory</CardTitle>
            <CardDescription>
              {parts.length} part{parts.length === 1 ? "" : "s"} · {lowStockCount} low stock
            </CardDescription>
          </div>
          <Button onClick={openAdd} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Part
          </Button>
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
                <TableHead className="text-sm font-medium text-tertiary">Part ID</TableHead>
                <TableHead className="text-sm font-medium text-tertiary">Name</TableHead>
                <TableHead className="text-sm font-medium text-tertiary">Unit</TableHead>
                <TableHead className="text-sm font-medium text-tertiary">Qty on Hand</TableHead>
                <TableHead className="text-sm font-medium text-tertiary">Unit Cost</TableHead>
                <TableHead className="text-sm font-medium text-tertiary">Stock Level</TableHead>
                <TableHead className="text-right text-sm font-medium text-tertiary">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((part) => {
                const level = STOCK_LEVELS[getStockLevel(part)];
                return (
                  <TableRow key={part.id}>
                    <TableCell className="text-xs text-muted-foreground">{part.code}</TableCell>
                    <TableCell className="font-medium">{part.name}</TableCell>
                    <TableCell className="text-muted-foreground">{unitLabel(part.unit)}</TableCell>
                    <TableCell className="font-medium">{part.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">{formatPeso(part.unitPrice)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={level.cls}>
                        {level.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Restock ${part.name}`}
                          className="hover:text-muted-foreground"
                          onClick={() => setRestocking(part)}
                        >
                          <PackagePlus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${part.name}`}
                          className="hover:text-muted-foreground"
                          onClick={() => openEdit(part)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${part.name}`}
                          className="hover:text-destructive"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleting(part);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!loading && parts.length === 0 && !loadError && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                    No parts yet. Add one to start tracking stock.
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
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
        description={`${deleting?.name ?? "This part"} will be discontinued and can no longer be logged on repair orders. Past orders keep their history.`}
        confirmLabel="Remove"
        destructive
        loading={deleteBusy}
        error={deleteError}
        onConfirm={handleDelete}
      />
    </div>
  );
}