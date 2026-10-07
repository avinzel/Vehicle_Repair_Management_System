"use client"

import { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StaffFormDialog } from "@/components/dialogs/StaffFormDialog";
import { FilterBar, matchesSearch, buildTabCounts } from "@/components/OrderSearchFilter";

const API = "http://localhost:8000/api.php";

const STATUS_STYLES = {
  ACTIVE: { label: "Active", cls: "bg-green-100 text-green-800 hover:bg-green-100" },
  INACTIVE: { label: "Inactive", cls: "bg-muted text-muted-foreground hover:bg-muted" },
};

const ROLE_STYLES = {
  Admin: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  "Service Advisor": "bg-blue-100 text-blue-800 hover:bg-blue-100",
  Mechanic: "bg-orange-100 text-orange-800 hover:bg-orange-100",
};

const ROLE_TABS = ["All", ...Object.keys(ROLE_STYLES)];

const AVATAR_COLORS = [
  "bg-blue-600", "bg-green-600", "bg-purple-600", "bg-orange-600", "bg-teal-600", "bg-rose-600",
];

// Row shape comes from sp_GetStaffMembers: user_id, full_name, email, phone,
// status, since, role_id, role.
// NOTE: that SP doesn't return username / first_name / middle_name / last_name
// yet, but PUT action=users requires username, first_name, last_name. Until
// the SP is extended, first/last name are guessed by splitting full_name and
// the username must be typed in by hand when editing. Extra fields are read
// here as soon as the backend starts sending them.
function normalizeStaff(raw) {
  const id = raw.user_id ?? raw.id;
  const fullName = raw.full_name ?? raw.name ?? "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    id,
    code: `S-${String(id).padStart(3, "0")}`,
    name: fullName || "—",
    firstName: raw.first_name ?? (parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] ?? ""),
    middleName: raw.middle_name ?? "",
    lastName: raw.last_name ?? (parts.length > 1 ? parts[parts.length - 1] : ""),
    username: raw.username ?? "",
    email: raw.email ?? "",
    phone: raw.phone ?? raw.contact_no ?? "",
    roleId: raw.role_id ?? null,
    role: raw.role ?? raw.role_name ?? "—",
    status: raw.status ?? "ACTIVE",
    since: raw.since ?? raw.created_at ?? null,
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

// Endpoints used:
//   GET    action=users      (admin only)
//   POST   action=register   (the dispatcher has no working POST on `users`)
//   PUT    action=users      { user_id, username, first_name, middle_name, last_name, contact_no, email, role_id, status }
//   DELETE action=users      { user_id }  -> soft delete, can't delete yourself
export function Staffs() {
  const { user } = useOutletContext() ?? {};
  const currentUserId = user?.user_id != null ? Number(user.user_id) : null;

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // staff row or null (= add)

  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const getStaff = useCallback(async () => {
    setLoadError(null);
    try {
      const json = await request(`${API}?action=users`);
      const rows = json.data ?? json.users ?? (Array.isArray(json) ? json : []);
      setStaff(rows.map(normalizeStaff));
    } catch (err) {
      setLoadError(err.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getStaff();
  }, [getStaff]);

  const activeCount = useMemo(() => staff.filter((s) => s.status === "ACTIVE").length, [staff]);

  const filteredStaff = useMemo(
    () =>
      staff.filter(
        (m) =>
          (roleFilter === "All" || m.role === roleFilter) &&
          matchesSearch(search, m.name, m.code, m.email, m.phone, m.role, m.username)
      ),
    [staff, search, roleFilter]
  );
  const roleCounts = useMemo(() => buildTabCounts(staff, (m) => m.role), [staff]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(member) {
    setEditing(member);
    setFormOpen(true);
  }

  async function handleSubmit(payload) {
    if (editing) {
      await request(`${API}?action=users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, user_id: editing.id }),
      });
    } else {
      await request(`${API}?action=register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    await getStaff();
  }

  async function handleDelete() {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await request(`${API}?action=users`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: deleting.id }),
      });
      setDeleting(null);
      await getStaff();
    } catch (err) {
      setDeleteError(err.message || "Failed to remove staff member");
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
          statusFilter={roleFilter}
          onStatusFilterChange={setRoleFilter}
          placeholder="Search by name, email, phone, or role..."
          tabs={ROLE_TABS}
          counts={roleCounts}
        />
      </div>

      <div className="pt-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-bold pb-1">Staff Members</CardTitle>
              <CardDescription>
                {staff.length} member{staff.length === 1 ? "" : "s"} · {activeCount} active
              </CardDescription>
            </div>
            <Button onClick={openAdd} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add Staff
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
                  <TableHead className="text-sm font-medium text-tertiary">Name</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Role</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Email</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Phone</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Status</TableHead>
                  <TableHead className="text-sm font-medium text-tertiary">Since</TableHead>
                  <TableHead className="text-right text-sm font-medium text-tertiary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((m) => {
                  const status = STATUS_STYLES[m.status] ?? STATUS_STYLES.INACTIVE;
                  const isSelf = currentUserId != null && Number(m.id) === currentUserId;
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
                          <span className="font-medium">
                            {m.name}
                            {isSelf && <span className="ml-1.5 text-xs text-muted-foreground font-normal">(you)</span>}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={ROLE_STYLES[m.role] ?? ""}>
                          {m.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.email || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{m.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={status.cls}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatSince(m.since)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${m.name}`}
                            onClick={() => openEdit(m)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove ${m.name}`}
                            className="hover:text-destructive"
                            disabled={isSelf}
                            title={isSelf ? "You can't remove your own account" : undefined}
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

                {!loading && staff.length > 0 && filteredStaff.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                      No staff members match your filters.
                    </TableCell>
                  </TableRow>
                )}
                {!loading && staff.length === 0 && !loadError && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                      No staff members yet.
                    </TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                      Loading staff...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <StaffFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          staff={editing}
          onSubmit={handleSubmit}
        />

        <ConfirmDialog
          open={!!deleting}
          onOpenChange={(open) => !open && !deleteBusy && setDeleting(null)}
          title="Remove staff member?"
          description={`${deleting?.name ?? "This staff member"} will be marked inactive and can no longer sign in. Past records keep their history.`}
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