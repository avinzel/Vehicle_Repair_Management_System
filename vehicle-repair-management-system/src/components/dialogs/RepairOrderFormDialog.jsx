"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PRIORITIES = ["STANDARD", "URGENT", "RUSH"];
const PRIORITY_LABEL = { STANDARD: "Standard", URGENT: "Urgent", RUSH: "Rush" };

function Field({ label, optional = false, className = "", children }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm font-medium">
        {label}
        {optional && <span className="text-muted-foreground font-normal"> (optional)</span>}
      </span>
      {children}
    </label>
  );
}

function Tile({ label, children }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium break-words">{children}</div>
    </div>
  );
}

// Edit-only modal. Only the fields the update-order endpoint accepts are
// editable (complaint, priority, mileage_at_service, diagnosis_notes);
// everything else is shown read-only. Status can't be changed here — it
// moves through the workflow actions.
//
// `order`    normalized row from RepairOrders.jsx, or null
// `onSubmit` receives the PUT body; must throw on failure so the message
//            shows inside the modal.
export function RepairOrderFormDialog({ open, onOpenChange, order, onSubmit }) {
  const [complaint, setComplaint] = useState("");
  const [priority, setPriority] = useState("STANDARD");
  const [mileage, setMileage] = useState("");
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !order) return;
    setError(null);
    setComplaint(order.complaint ?? "");
    setPriority(order.priority ?? "STANDARD");
    setMileage(order.mileage != null ? String(order.mileage) : "");
    setDiagnosisNotes(order.diagnosisNotes ?? "");
  }, [open, order]);

  const mileageValid = mileage.trim() === "" || /^\d+$/.test(mileage.trim());
  const canSubmit = !submitting && complaint.trim() && mileageValid;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        order_id: order.rawId,
        complaint: complaint.trim(),
        priority,
        mileage_at_service: mileage.trim() === "" ? null : Number(mileage.trim()),
        diagnosis_notes: diagnosisNotes.trim() || null,
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Repair Order{order ? ` · ${order.id}` : ""}</DialogTitle>
          <DialogDescription>
            Update the complaint, priority, mileage, or diagnosis notes. Status changes happen
            through the normal workflow.
          </DialogDescription>
        </DialogHeader>

        {order && (
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Customer">{order.customer}</Tile>
            <Tile label="Status">
              <StatusBadge status={order.status} />
            </Tile>
            <Tile label="Vehicle">{order.vehicle}</Tile>
            <Tile label="Plate">{order.plateNumber ?? "—"}</Tile>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Customer complaint">
            <Textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="Describe the issue reported by the customer..."
              maxLength={500}
              disabled={submitting}
              className="min-h-24 bg-background"
              autoFocus
            />
          </Field>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Priority</span>
            <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Priority">
              {PRIORITIES.map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={priority === p ? "default" : "outline"}
                  aria-pressed={priority === p}
                  disabled={submitting}
                  onClick={() => setPriority(p)}
                  className="min-w-[90px]"
                >
                  {PRIORITY_LABEL[p]}
                </Button>
              ))}
            </div>
          </div>

          <Field label="Mileage at service" optional>
            <Input
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              placeholder="e.g. 45200"
              inputMode="numeric"
              aria-invalid={!mileageValid}
              disabled={submitting}
            />
            {!mileageValid && <p className="text-sm text-destructive">Enter a whole number</p>}
          </Field>

          <Field label="Diagnosis notes" optional>
            <Textarea
              value={diagnosisNotes}
              onChange={(e) => setDiagnosisNotes(e.target.value)}
              placeholder="Inspection findings..."
              disabled={submitting}
              className="min-h-24 bg-background"
            />
          </Field>

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