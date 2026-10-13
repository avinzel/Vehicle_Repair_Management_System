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

// Stored value (parts_inventory.unit) -> label shown in the UI.
export const PART_UNITS = [
  { value: "pc", label: "Piece" },
  { value: "set", label: "Set" },
  { value: "pair", label: "Pair" },
  { value: "liter", label: "Liter" },
  { value: "bottle", label: "Bottle" },
];

const VEHICLE_TYPES = [
  { value: "CAR", label: "Car" },
  { value: "MOTORCYCLE", label: "Motorcycle" },
  { value: "TRICYCLE", label: "Tricycle" },
];

function parseVehicleTypes(value) {
  const types = Array.isArray(value) ? value : String(value ?? "").split(",");
  return types.map((type) => type.trim().toUpperCase()).filter((type) =>
    VEHICLE_TYPES.some((vehicleType) => vehicleType.value === type)
  );
}

export function unitLabel(unit) {
  const match = PART_UNITS.find((u) => u.value === unit);
  if (match) return match.label;
  return unit ? unit.charAt(0).toUpperCase() + unit.slice(1) : "—";
}

function Field({ label, children, asGroup = false }) {
  const Wrapper = asGroup ? "div" : "label";
  return (
    <Wrapper className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </Wrapper>
  );
}

// Create + edit in one modal. onSubmit receives the payload shaped for
// the API and must throw on failure so the message shows inside the modal.
export function PartFormDialog({ open, onOpenChange, part, onSubmit }) {
  const isEdit = !!part;

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pc");
  const [vehicleTypes, setVehicleTypes] = useState(VEHICLE_TYPES.map((type) => type.value));
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset whenever the modal opens (or switches between add / edit).
  useEffect(() => {
    if (!open) return;
    setError(null);
    setName(part?.part_name ?? "");
    setUnit(part?.unit ?? "pc");
    setVehicleTypes(part ? parseVehicleTypes(part.vehicle_types) : VEHICLE_TYPES.map((type) => type.value));
    setQuantity(part ? String(part.quantity_on_hand) : "");
    setUnitPrice(part ? String(part.unit_price) : "");
  }, [open, part]);

  // Existing parts may carry a unit that isn't in the preset list; keep it
  // selectable so editing doesn't silently change it.
  const unitItems = PART_UNITS.some((u) => u.value === unit)
    ? PART_UNITS
    : [...PART_UNITS, { value: unit, label: unitLabel(unit) }];

  const qtyNumber = Number(quantity);
  const priceNumber = Number(unitPrice);
  const qtyValid = quantity !== "" && Number.isInteger(qtyNumber) && qtyNumber >= 0;
  const priceValid = unitPrice !== "" && Number.isFinite(priceNumber) && priceNumber >= 0;
  const canSubmit = !submitting && name.trim() && unit && vehicleTypes.length > 0 && qtyValid && priceValid;

  function toggleVehicleType(value) {
    setVehicleTypes((selected) =>
      selected.includes(value)
        ? selected.filter((type) => type !== value)
        : [...selected, value]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        part_name: name.trim(),
        unit,
        vehicle_types: vehicleTypes.join(","),
        quantity_on_hand: qtyNumber,
        unit_price: priceNumber,
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
          <DialogTitle>{isEdit ? "Edit Part" : "Add Part"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this part's name, unit, stock, or cost."
              : "Add a new part to the inventory."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Part name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engine Oil (1L)"
              maxLength={150}
              disabled={submitting}
            />
          </Field>

          <Field label="Vehicle type" asGroup>
            <div className="flex flex-wrap gap-4 rounded-md border border-input bg-background px-3 py-2.5">
              {VEHICLE_TYPES.map((type) => (
                <label key={type.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={vehicleTypes.includes(type.value)}
                    onChange={() => toggleVehicleType(type.value)}
                    disabled={submitting}
                    className="size-4 accent-primary"
                    aria-label={type.label}
                  />
                  {type.label}
                </label>
              ))}
            </div>
            {vehicleTypes.length === 0 && (
              <span className="block text-xs text-destructive">Select at least one vehicle type.</span>
            )}
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Unit">
              <Select
                items={unitItems}
                value={unit}
                onValueChange={(v) => setUnit(v ?? "pc")}
                disabled={submitting}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitItems.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Qty on hand">
              <Input
                type="number"
                min={0}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                disabled={submitting}
              />
            </Field>

            <Field label="Unit cost (₱)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0.00"
                disabled={submitting}
              />
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
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add part"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}