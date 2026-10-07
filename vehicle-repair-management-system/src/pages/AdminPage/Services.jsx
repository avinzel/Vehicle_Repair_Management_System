"use client"

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ServiceFormDialog } from "@/components/dialogs/ServiceFormDialog";

const API = "http://localhost:8000/api.php";

// Row shape follows the service_catalog table / GET action=services
// (service_catalog_id, service_name, description, standard_labor_cost).
// TODO: tighten once the backend teammate's real responses are confirmed.
function normalizeService(raw) {
  return {
    id: raw.service_catalog_id ?? raw.id,
    name: raw.service_name ?? raw.name ?? "—",
    description: raw.description ?? "",
    laborCost: Number(raw.standard_labor_cost ?? raw.laborCost ?? 0),
  };
}

function formatPeso(amount) {
  return `₱${Number(amount ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

async function request(url, options) {
  const res = await fetch(url, { credentials: "include", ...options });
  // DELETE may answer 204 with no body
  const json = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? json.message ?? `Request failed (HTTP ${res.status})`);
  return json;
}

// Expected endpoints (backend pending):
//   GET    action=services                      -> { data: [...] }
//   POST   action=services                      { service_name, description, standard_labor_cost }
//   PUT    action=services                      { service_catalog_id, service_name, description, standard_labor_cost }
//   DELETE action=services                      { service_catalog_id }
export function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // service row or null (= add)

  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const getServices = useCallback(async () => {
    setLoadError(null);
    try {
      const json = await request(`${API}?action=services&`);
      const rows = json.data ?? json.services ?? (Array.isArray(json) ? json : []);
      setServices(rows.map(normalizeService));
    } catch (err) {
      setLoadError(err.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getServices();
  }, [getServices]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(service) {
    setEditing(service);
    setFormOpen(true);
  }

  async function handleSubmit(payload) {
    if (editing) {
      await request(`${API}?action=services`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, service_catalog_id: editing.id }),
      });
    } else {
      await request(`${API}?action=services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    await getServices();
  }

  async function handleDelete() {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await request(`${API}?action=services`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_catalog_id: deleting.id }),
      });
      setDeleting(null);
      await getServices();
    } catch (err) {
      setDeleteError(err.message || "Failed to delete service");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-bold pb-1">Service Catalogue</CardTitle>
            <CardDescription>
              {services.length} service{services.length === 1 ? "" : "s"}
            </CardDescription>
          </div>
          <Button onClick={openAdd} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Service
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
                <TableHead className="text-sm font-medium text-tertiary">ID</TableHead>
                <TableHead className="text-sm font-medium text-tertiary">Service Name</TableHead>
                <TableHead className="text-sm font-medium text-tertiary">Description</TableHead>
                <TableHead className="text-sm font-medium text-tertiary">Standard Labor Cost</TableHead>
                <TableHead className="text-right text-sm font-medium text-tertiary">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs text-muted-foreground">{s.id}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-sm whitespace-normal">
                    <span className="line-clamp-2">{s.description || "—"}</span>
                  </TableCell>
                  <TableCell className="font-medium">{formatPeso(s.laborCost)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${s.name}`}
                        className="hover:text-muted-foreground"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${s.name}`}
                        className="hover:text-destructive"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleting(s);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && services.length === 0 && !loadError && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                    No services yet. Add one so diagnosticians can pick it on repair orders.
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">
                    Loading services...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && !deleteBusy && setDeleting(null)}
        title="Delete service?"
        description={`"${deleting?.name ?? "This service"}" will be removed from the catalogue and can no longer be selected in diagnoses. Existing repair orders keep their history.`}
        confirmLabel="Delete"
        destructive
        loading={deleteBusy}
        error={deleteError}
        onConfirm={handleDelete}
      />
    </div>
  );
}