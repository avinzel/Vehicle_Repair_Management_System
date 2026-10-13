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

const MECHANIC_STATUSES = [
  { value: "ACTIVE", label: "Active" },
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

// onSubmit receives the payload shaped for the API and must throw on
// failure so the message shows inside the modal.
export function MechanicFormDialog({ open, onOpenChange, mechanic, onSubmit }) {
  const [specialization, setSpecialization] = useState("");
  const [dateHired, setDateHired] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset whenever the modal opens or switches to another mechanic.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSpecialization(mechanic?.specialization ?? "");
    setDateHired(mechanic?.dateHired ? String(mechanic.dateHired).slice(0, 10) : "");
    setStatus(mechanic?.status ?? "ACTIVE");
  }, [open, mechanic]);

  const canSubmit = !submitting && specialization.trim() && dateHired;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
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
          <DialogTitle>Edit Mechanic</DialogTitle>
          <DialogDescription>
            Update this mechanic's specialization, hire date, or status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Staff account">
            <Input value={mechanic?.name ?? ""} disabled />
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
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}