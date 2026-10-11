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

// Adds stock to a part. onSubmit receives the quantity to add (a positive
// integer) and must throw on failure so the message shows inside the modal.
export function RestockPartDialog({ open, onOpenChange, part, onSubmit }) {
  const [quantity, setQuantity] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setQuantity("1");
    setError(null);
  }, [open, part]);

  const qtyNumber = Number(quantity);
  const qtyValid = quantity !== "" && Number.isInteger(qtyNumber) && qtyNumber > 0;
  const current = part?.quantity ?? 0;
  const unit = part?.unit ?? "pc";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!qtyValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(qtyNumber);
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Restock Part</DialogTitle>
          <DialogDescription>{part?.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Current stock</span>
            <span className="font-bold">
              {current} {unit}(s)
            </span>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Add quantity</span>
            <Input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={submitting}
              autoFocus
            />
            <span className="block text-xs text-muted-foreground">
              New total: {qtyValid ? current + qtyNumber : "—"} {unit}(s)
            </span>
          </label>

          <p className="text-xs text-muted-foreground">
            Repair orders waiting on this part are fulfilled automatically, oldest first.
          </p>

          {error && (
            <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!qtyValid || submitting}>
              {submitting ? "Restocking..." : "Confirm restock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}