"use client"

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
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

const VEHICLE_TYPES = ["CAR", "MOTORCYCLE", "TRICYCLE"];
const VEHICLE_TYPE_LABEL = { CAR: "Car", MOTORCYCLE: "Motorcycle", TRICYCLE: "Tricycle" };
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function emptyVehicle() {
  return {
    key: crypto.randomUUID(),
    vehicle_id: null, // null = new vehicle (omitting vehicle_id adds it on PUT)
    plate_number: "",
    vehicle_type: "CAR",
    manufacturer: "",
    model: "",
    year_model: "",
    color: "",
    vin_number: "",
    current_mileage: "",
  };
}

// GET customer_id=X -> data.vehicles[] -> local form shape
function vehicleFromApi(v) {
  return {
    key: `v-${v.vehicle_id}`,
    vehicle_id: v.vehicle_id,
    plate_number: v.plate_number ?? "",
    vehicle_type: v.vehicle_type ?? "CAR",
    manufacturer: v.manufacturer ?? "",
    model: v.model ?? "",
    year_model: v.year_model != null ? String(v.year_model) : "",
    color: v.color ?? "",
    vin_number: v.vin_number ?? "",
    current_mileage: v.current_mileage != null ? String(v.current_mileage) : "",
  };
}

// Local form shape -> PUT body vehicle object
function vehicleToPayload(v) {
  const year = v.year_model.trim();
  const mileage = v.current_mileage.trim();
  return {
    ...(v.vehicle_id != null ? { vehicle_id: v.vehicle_id } : {}),
    plate_number: v.plate_number.trim(),
    vehicle_type: v.vehicle_type,
    manufacturer: v.manufacturer.trim(),
    model: v.model.trim(),
    year_model: year ? Number(year) : null,
    color: v.color.trim() || null,
    vin_number: v.vin_number.trim() || null,
    current_mileage: mileage ? Number(mileage) : 0,
  };
}

function vehicleIsValid(v) {
  if (!v.plate_number.trim() || !v.manufacturer.trim() || !v.model.trim()) return false;
  if (v.year_model.trim() && !/^\d{4}$/.test(v.year_model.trim())) return false;
  if (v.current_mileage.trim() && !/^\d+$/.test(v.current_mileage.trim())) return false;
  return true;
}

// Edit-only modal (admins don't create customers here).
//
// `customer`    normalized list row ({ id, name, ... }) or null
// `loadDetails` (customerId) => Promise<{ customer, vehicles }>  — the list
//               endpoint has no address or vehicles, so they're fetched
//               when the dialog opens.
// `onSubmit`    receives the PUT body; must throw on failure so the
//               message shows inside the modal.
export function CustomerFormDialog({ open, onOpenChange, customer, loadDetails, onSubmit }) {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [vehicles, setVehicles] = useState([]);

  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const customerId = customer?.id;

  // Reset + load details whenever the modal opens for a customer.
  useEffect(() => {
    if (!open || customerId == null) return;
    let cancelled = false;

    setError(null);
    setDetailsLoaded(false);
    setLoadingDetails(true);
    // Paint what the list row already has, immediately.
    setFirstName(customer.firstName ?? "");
    setMiddleName(customer.middleName ?? "");
    setLastName(customer.lastName ?? "");
    setContactNo(customer.phone ?? "");
    setEmail(customer.email ?? "");
    setAddress("");
    setVehicles([]);

    loadDetails(customerId)
      .then((data) => {
        if (cancelled) return;
        const c = data.customer ?? {};
        setFirstName(c.first_name ?? "");
        setMiddleName(c.middle_name ?? "");
        setLastName(c.last_name ?? "");
        setContactNo(c.contact_no ?? "");
        setEmail(c.email ?? "");
        setAddress(c.address ?? "");
        setVehicles((data.vehicles ?? []).map(vehicleFromApi));
        setDetailsLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load customer details");
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerId]);

  function updateVehicle(key, changes) {
    setVehicles((prev) => prev.map((v) => (v.key === key ? { ...v, ...changes } : v)));
  }

  function addVehicle() {
    setVehicles((prev) => [...prev, emptyVehicle()]);
  }

  // Only unsaved vehicles can be removed — there is no vehicle delete endpoint.
  function removeNewVehicle(key) {
    setVehicles((prev) => prev.filter((v) => v.key !== key));
  }

  const emailValid = !email.trim() || EMAIL_REGEX.test(email.trim());
  const vehiclesValid = vehicles.every(vehicleIsValid);
  const canSubmit =
    !submitting &&
    !loadingDetails &&
    detailsLoaded &&
    firstName.trim() &&
    lastName.trim() &&
    contactNo.trim() &&
    emailValid &&
    vehiclesValid;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        first_name: firstName.trim(),
        middle_name: middleName.trim() || null,
        last_name: lastName.trim(),
        contact_no: contactNo.trim(),
        email: email.trim() || null,
        address: address.trim() || null,
        vehicles: vehicles.map(vehicleToPayload),
      });
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || loadingDetails;

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update contact details and registered vehicles
            {customer?.formattedId ? ` for ${customer.formattedId}` : ""}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="First name">
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jamie"
                disabled={disabled}
                autoFocus
              />
            </Field>
            <Field label="Middle name" optional>
              <Input
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                disabled={disabled}
              />
            </Field>
            <Field label="Last name">
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Santos"
                disabled={disabled}
              />
            </Field>

            <Field label="Contact number" className="sm:col-span-1">
              <Input
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
                placeholder="09171234567"
                maxLength={20}
                disabled={disabled}
              />
            </Field>
            <Field label="Email" optional className="sm:col-span-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jamie@example.com"
                aria-invalid={!emailValid}
                disabled={disabled}
              />
              {!emailValid && <p className="text-sm text-destructive">Enter a valid email address</p>}
            </Field>

            <Field label="Address" optional className="sm:col-span-3">
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House No., Street, Barangay, City/Municipality"
                maxLength={255}
                disabled={disabled}
                className="min-h-16 bg-background"
              />
            </Field>
          </div>

          {/* Vehicles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Vehicles
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={addVehicle}
                disabled={disabled || !detailsLoaded}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Vehicle
              </Button>
            </div>

            {loadingDetails && <p className="text-sm text-muted-foreground">Loading vehicles...</p>}

            {!loadingDetails && detailsLoaded && vehicles.length === 0 && (
              <p className="text-sm text-muted-foreground">No vehicles registered yet.</p>
            )}

            {vehicles.map((v, index) => {
              const isNew = v.vehicle_id == null;
              return (
                <div key={v.key} className="border border-border rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      Vehicle {index + 1}
                      {isNew && <span className="ml-2 text-xs font-normal text-primary">New</span>}
                    </p>
                    {isNew && (
                      <button
                        type="button"
                        aria-label="Remove vehicle"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeNewVehicle(v.key)}
                        disabled={submitting}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-sm font-medium">Vehicle type</span>
                    <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Vehicle type">
                      {VEHICLE_TYPES.map((type) => (
                        <Button
                          key={type}
                          type="button"
                          size="sm"
                          variant={v.vehicle_type === type ? "default" : "outline"}
                          aria-pressed={v.vehicle_type === type}
                          disabled={submitting}
                          onClick={() => updateVehicle(v.key, { vehicle_type: type })}
                        >
                          {VEHICLE_TYPE_LABEL[type]}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Plate number">
                      <Input
                        value={v.plate_number}
                        onChange={(e) => updateVehicle(v.key, { plate_number: e.target.value })}
                        placeholder="ABC-1234"
                        maxLength={20}
                        disabled={submitting}
                      />
                    </Field>
                    <Field label="Manufacturer">
                      <Input
                        value={v.manufacturer}
                        onChange={(e) => updateVehicle(v.key, { manufacturer: e.target.value })}
                        placeholder="Toyota"
                        maxLength={50}
                        disabled={submitting}
                      />
                    </Field>
                    <Field label="Model">
                      <Input
                        value={v.model}
                        onChange={(e) => updateVehicle(v.key, { model: e.target.value })}
                        placeholder="Vios"
                        maxLength={50}
                        disabled={submitting}
                      />
                    </Field>
                    <Field label="Year" optional>
                      <Input
                        value={v.year_model}
                        onChange={(e) => updateVehicle(v.key, { year_model: e.target.value })}
                        placeholder="2021"
                        inputMode="numeric"
                        maxLength={4}
                        aria-invalid={!!v.year_model.trim() && !/^\d{4}$/.test(v.year_model.trim())}
                        disabled={submitting}
                      />
                    </Field>
                    <Field label="Color" optional>
                      <Input
                        value={v.color}
                        onChange={(e) => updateVehicle(v.key, { color: e.target.value })}
                        placeholder="Silver"
                        maxLength={30}
                        disabled={submitting}
                      />
                    </Field>
                    <Field label="Current mileage" optional>
                      <Input
                        value={v.current_mileage}
                        onChange={(e) => updateVehicle(v.key, { current_mileage: e.target.value })}
                        placeholder="12000"
                        inputMode="numeric"
                        aria-invalid={!!v.current_mileage.trim() && !/^\d+$/.test(v.current_mileage.trim())}
                        disabled={submitting}
                      />
                    </Field>
                    <Field label="VIN" optional className="sm:col-span-2">
                      <Input
                        value={v.vin_number}
                        onChange={(e) => updateVehicle(v.key, { vin_number: e.target.value })}
                        placeholder="e.g. 1HGCR2F8XHA000000"
                        maxLength={17}
                        disabled={submitting}
                      />
                    </Field>
                  </div>
                </div>
              );
            })}

            {detailsLoaded && (
              <p className="text-xs text-muted-foreground">
                Saved vehicles can be edited but not removed
              </p>
            )}
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