"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API = "http://localhost:8000/api.php";
const MECHANIC_ROLE_ID = 3;

export const MECHANIC_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_LEAVE", label: "On Leave" },
  { value: "INACTIVE", label: "Inactive" },
];

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

// Create + edit in one modal. A mechanic is a `users` row with role 3, so
// "add" means picking an existing mechanic-role account that isn't on the
// roster yet (POST needs user_id). In edit mode the account is locked.
//
// onSubmit receives the payload shaped for the API and must throw on
// failure so the message shows inside the modal.
export function MechanicFormDialog({ open, onOpenChange, mechanic, takenUserIds = [], onSubmit }) {
  const isEdit = !!mechanic;

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userId, setUserId] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [dateHired, setDateHired] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset whenever the modal opens (or switches between add / edit).
  useEffect(() => {
    if (!open) return;
    setError(null);
    setUserId(mechanic?.userId != null ? String(mechanic.userId) : "");
    setSpecialization(mechanic?.specialization ?? "");
    setDateHired(mechanic?.dateHired ? String(mechanic.dateHired).slice(0, 10) : "");
    setStatus(mechanic?.status ?? "ACTIVE");
  }, [open, mechanic]);

  // Add mode: load accounts that can become mechanics.
  useEffect(() => {
    if (!open || isEdit) return;
    let cancelled = false;
    setLoadingUsers(true);
    fetch(`${API}?action=users`, { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const rows = json.data ?? json.users ?? [];
        setUsers(Array.isArray(rows) ? rows : []);
      })
      .catch(() => !cancelled && setError("Failed to load staff accounts"))
      .finally(() => !cancelled && setLoadingUsers(false));
    return () => {
      cancelled = true;
    };
  }, [open, isEdit]);

  const eligibleUsers = users.filter(
    (u) =>
      Number(u.role_id) === MECHANIC_ROLE_ID &&
      u.status !== "INACTIVE" &&
      !takenUserIds.includes(Number(u.user_id))
  );

  const userItems = eligibleUsers.map((u) => ({
    value: String(u.user_id),
    label: u.full_name,
  }));

  const canSubmit =
    !submitting && (isEdit || userId) && specialization.trim() && dateHired;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        user_id: Number(userId),
        specialization: specialization.trim(),
        date_hired: dateHired,
        status,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Mechanic" : "Add Mechanic"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this mechanic's specialization, hire date, or status."
              : "Add an existing mechanic account to the workshop roster."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Staff account">
            {isEdit ? (
              <Input value={mechanic.name} disabled />
            ) : (
              <Select
                items={userItems}
                value={userId || null}
                onValueChange={(v) => setUserId(v ?? "")}
                disabled={loadingUsers || submitting}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue
                    placeholder={loadingUsers ? "Loading accounts..." : "Select a mechanic account..."}
                  />
                </SelectTrigger>
                <SelectContent>
                  {eligibleUsers.map((u) => (
                    <SelectItem key={u.user_id} value={String(u.user_id)}>
                      {u.full_name}
                      {u.email && <span className="text-muted-foreground"> · {u.email}</span>}
                    </SelectItem>
                  ))}
                  {!loadingUsers && eligibleUsers.length === 0 && (
                    <p className="p-2 text-sm text-muted-foreground">
                      No unassigned mechanic accounts. Register one in Staff first.
                    </p>
                  )}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field label="Specialization">
            <Input
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="e.g. Engine Diagnostics"
              disabled={submitting}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date hired">
              <Input
                type="date"
                value={dateHired}
                onChange={(e) => setDateHired(e.target.value)}
                disabled={submitting}
              />
            </Field>
            <Field label="Status">
              <Select
                items={MECHANIC_STATUSES}
                value={status}
                onValueChange={(v) => setStatus(v ?? "ACTIVE")}
                disabled={submitting}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MECHANIC_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add Mechanic"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}