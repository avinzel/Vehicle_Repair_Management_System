"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

// Create + edit in one modal (same pattern as MechanicFormDialog /
// PartFormDialog). `service` is the normalized row (id, name, description,
// laborCost) or null for "add".
//
// onSubmit receives the payload shaped for the API and must throw on
// failure so the message shows inside the modal.
export function ServiceFormDialog({ open, onOpenChange, service, onSubmit }) {
  const isEdit = !!service;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [laborCost, setLaborCost] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset whenever the modal opens (or switches between add / edit).
  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(service?.name ?? "");
    setDescription(service?.description ?? "");
    setLaborCost(service ? String(service.laborCost) : "0");
  }, [open, service]);

  const costNumber = Number(laborCost);
  const costValid = laborCost !== "" && Number.isFinite(costNumber) && costNumber >= 0;
  const canSubmit = !submitting && name.trim() && costValid;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        service_name: name.trim(),
        description: description.trim() || null,
        standard_labor_cost: costNumber,
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
          <DialogTitle>{isEdit ? "Edit Service" : "Add Service"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this service's name, description, or standard labor cost."
              : "Add a new service to the workshop catalogue."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Service name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brake System Overhaul"
              maxLength={150}
              disabled={submitting}
              autoFocus
            />
          </Field>

          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the service..."
              maxLength={255}
              disabled={submitting}
              className="min-h-20 bg-background"
            />
          </Field>

          <Field label="Standard labor cost (₱)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={laborCost}
              onChange={(e) => setLaborCost(e.target.value)}
              placeholder="0.00"
              disabled={submitting}
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
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}