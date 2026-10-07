"use client"

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MechanicFormDialog } from "@/components/dialogs/MechanicFormDialog";

const API = "http://localhost:8000/api.php";

const STATUS_STYLES = {
  ACTIVE: { label: "Active", cls: "bg-green-100 text-green-800 hover:bg-green-100" },
  ON_LEAVE: { label: "On Leave", cls: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  INACTIVE: { label: "Inactive", cls: "bg-muted text-muted-foreground hover:bg-muted" },
};

const AVATAR_COLORS = [
  "bg-blue-600", "bg-green-600", "bg-purple-600", "bg-orange-600", "bg-teal-600", "bg-rose-600",
];

// Row shape comes from get_all_mechanics. NOTE: that SP doesn't return
// user_id yet — editing needs it (PUT requires user_id), see the notes.
function normalizeMechanic(raw) {
  const id = raw.mechanic_id ?? raw.id;
  return {
    id,
    code: `M-${String(id).padStart(3, "0")}`,
    userId: raw.user_id ?? null,
    name: raw.full_name ?? raw.name ?? "—",
    email: raw.email ?? "—",
    phone: raw.contact_no ?? raw.phone ?? "—",
    specialization: raw.specialization ?? "",
    dateHired: raw.date_hired ?? null,
    status: raw.mechanic_status ?? raw.status ?? "ACTIVE",
  };
}

function formatSince(value) {
  if (!value) return "—";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function initials(name) {
  return name.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

async function request(url, options) {
  const res = await fetch(url, { credentials: "include", ...options });
  // DELETE answers 204 with no body
  const json = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? json.message ?? `Request failed (HTTP ${res.status})`);
  return json;
}

export function MechanicsPage() {
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // mechanic row or null (= add)

  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const getMechanics = useCallback(async () => {
    setLoadError(null);
    try {
      const json = await request(`${API}?action=mechanics`);
      const rows = json.data ?? json.mechanics ?? (Array.isArray(json) ? json : []);
      setMechanics(rows.map(normalizeMechanic));
    } catch (err) {
      setLoadError(err.message || "Failed to load mechanics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getMechanics();
  }, [getMechanics]);

  const activeCount = useMemo(() => mechanics.filter((m) => m.status === "ACTIVE").length, [mechanics]);
  const takenUserIds = useMemo(
    () => mechanics.map((m) => Number(m.userId)).filter(Number.isFinite),
    [mechanics]
  );

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(mechanic) {
    setEditing(mechanic);
    setFormOpen(true);
  }

  async function handleSubmit(payload) {
    if (editing) {
      await request(`${API}?action=mechanics`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, mechanic_id: editing.id, user_id: editing.userId ?? payload.user_id }),
      });
    } else {
      await request(`${API}?action=mechanics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    await getMechanics();
  }

  async function handleDelete() {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await request(`${API}?action=mechanics`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mechanic_id: deleting.id }),
      });
      setDeleting(null);
      await getMechanics();
    } catch (err) {
      setDeleteError(err.message || "Failed to remove mechanic");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-bold pb-1">Manage Mechanics</CardTitle>
            <CardDescription>
              {mechanics.length} mechanic{mechanics.length === 1 ? "" : "s"} · {activeCount} active
            </CardDescription>
          </div>
          <Button onClick={openAdd} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add Mechanic
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
                <TableHead className="text-sm font-medium text-tertiary">Mechanic</TableHead>
                <TableHead className="text-sm font-medium text-tertiary">Specialization</TableHead>
                <TableHead className="text-sm font-medium text-tertiary">Email</TableHead>
                <TableHead className="text-sm font-medium text-tertiary">Phone</TableHead>
                <TableHead className="text-sm font-medium text-tertiary">Status</TableHead>
                <TableHead className="text-sm font-medium text-tertiary">Since</TableHead>
                <TableHead className="text-right text-sm font-medium text-tertiary">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mechanics.map((m) => {
                const status = STATUS_STYLES[m.status] ?? STATUS_STYLES.INACTIVE;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-muted-foreground">{m.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 ${
                            AVATAR_COLORS[m.id % AVATAR_COLORS.length]
                          }`}
                        >
                          {initials(m.name)}
                        </div>
                        <span className="font-medium">{m.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.specialization ? (
                        <Badge variant="secondary">{m.specialization}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell className="text-muted-foreground">{m.phone}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={status.cls}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatSince(m.dateHired)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${m.name}`}
                          className="hover:text-muted-foreground"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${m.name}`}
                          className="hover:text-destructive"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleting(m);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!loading && mechanics.length === 0 && !loadError && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                    No mechanics yet. Add one to start assigning jobs.
                  </TableCell>
                </TableRow>
              )}
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                    Loading mechanics...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MechanicFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mechanic={editing}
        takenUserIds={takenUserIds}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && !deleteBusy && setDeleting(null)}
        title="Remove mechanic?"
        description={`${deleting?.name ?? "This mechanic"} will be marked inactive and can no longer be assigned to repair orders. Past orders keep their history.`}
        confirmLabel="Remove"
        destructive
        loading={deleteBusy}
        error={deleteError}
        onConfirm={handleDelete}
      />
    </div>
  );
}