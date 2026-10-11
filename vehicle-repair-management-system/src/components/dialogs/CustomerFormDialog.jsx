"use client"

import { useState, useEffect, useRef } from "react";
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
const NAME_REGEX = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const PHONE_REGEX = /^(?:09\d{9}|\+639\d{9})$/;

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

function nameError(value, label, required = true) {
  const name = value.trim();
  if (!name && required) return `${label} is required.`;
  if (name.length > 75) return `${label} must be 75 characters or fewer.`;
  if (name && !NAME_REGEX.test(name)) {
    return `${label} can contain letters, spaces, apostrophes, periods, and hyphens only.`;
  }
  return null;
}

function vehicleErrors(vehicle) {
  const errors = {};
  for (const [field, label, maxLength] of [
    ["plate_number", "Plate number", 20],
    ["manufacturer", "Manufacturer", 50],
    ["model", "Model", 50],
  ]) {
    const value = vehicle[field].trim();
    if (!value) errors[field] = `${label} is required.`;
    else if (value.length > maxLength) errors[field] = `${label} must be ${maxLength} characters or fewer.`;
  }
  if (!VEHICLE_TYPES.includes(vehicle.vehicle_type)) {
    errors.vehicle_type = "Select a valid vehicle type.";
  }

  const year = vehicle.year_model.trim();
  if (year && (!/^\d{4}$/.test(year) || Number(year) < 1901 || Number(year) > 2155)) {
    errors.year_model = "Enter a year between 1901 and 2155.";
  }
  const mileage = vehicle.current_mileage.trim();
  if (mileage && (!/^\d+$/.test(mileage) || !Number.isSafeInteger(Number(mileage)))) {
    errors.current_mileage = "Enter a non-negative whole number.";
  }
  if (vehicle.color.trim().length > 30) errors.color = "Color must be 30 characters or fewer.";
  if (vehicle.vin_number.trim().length > 50) errors.vin_number = "VIN must be 50 characters or fewer.";
  return errors;
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
  const [showValidation, setShowValidation] = useState(false);
  const dialogContentRef = useRef(null);
  const errorSummaryRef = useRef(null);

  const customerId = customer?.id;

  // Reset + load details whenever the modal opens for a customer.
  useEffect(() => {
    if (!open || customerId == null) return;
    let cancelled = false;

    setError(null);
    setShowValidation(false);
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

  const firstNameError = nameError(firstName, "First name");
  const middleNameError = nameError(middleName, "Middle name", false);
  const lastNameError = nameError(lastName, "Last name");
  const contactDigits = contactNo.trim().replace(/[\s()-]/g, "");
  const contactError = !contactNo.trim()
    ? "Contact number is required."
    : contactNo.trim().length > 20 || !PHONE_REGEX.test(contactDigits)
      ? "Enter a valid Philippine mobile number (e.g. 09171234567 or +639171234567)."
      : null;
  const emailError = email.trim() && email.trim().length > 100
    ? "Email must be 100 characters or fewer."
    : email.trim() && !EMAIL_REGEX.test(email.trim())
      ? "Enter a valid email address."
      : null;
  const addressError = address.length > 255 ? "Address must be 255 characters or fewer." : null;
  const currentVehicleErrors = vehicles.map(vehicleErrors);
  const vehiclesValid = currentVehicleErrors.every((errors) => Object.keys(errors).length === 0);
  const customerValid = !firstNameError && !middleNameError && !lastNameError &&
    !contactError && !emailError && !addressError && vehiclesValid;
  const vehicleFieldLabels = {
    vehicle_type: "Vehicle type",
    plate_number: "Plate number",
    manufacturer: "Manufacturer",
    model: "Model",
    year_model: "Year",
    current_mileage: "Current mileage",
    color: "Color",
    vin_number: "VIN",
  };
  const validationIssues = [
    ["First name", firstNameError],
    ["Middle name", middleNameError],
    ["Last name", lastNameError],
    ["Contact number", contactError],
    ["Email", emailError],
    ["Address", addressError],
    ...currentVehicleErrors.flatMap((errors, index) =>
      Object.entries(errors).map(([field, message]) => [
        `Vehicle ${index + 1} — ${vehicleFieldLabels[field]}`,
        message,
      ])
    ),
  ].filter(([, message]) => message);

  function scrollToErrorSummary() {
    requestAnimationFrame(() => {
      dialogContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      errorSummaryRef.current?.focus({ preventScroll: true });
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setShowValidation(true);
    if (submitting || loadingDetails || !detailsLoaded) return;
    if (!customerValid) {
      scrollToErrorSummary();
      return;
    }
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
      scrollToErrorSummary();
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || loadingDetails;

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent ref={dialogContentRef} className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update contact details and registered vehicles
            {customer?.formattedId ? ` for ${customer.formattedId}` : ""}.
          </DialogDescription>
        </DialogHeader>

        {(error || (showValidation && validationIssues.length > 0)) && (
          <div
            ref={errorSummaryRef}
            tabIndex={-1}
            role="alert"
            aria-live="assertive"
            className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive outline-none"
          >
            {error ? (
              <p>{error}</p>
            ) : (
              <>
                <p className="font-semibold">
                  Please fix {validationIssues.length} field{validationIssues.length === 1 ? "" : "s"} below.
                </p>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {validationIssues.map(([field, message]) => (
                    <li key={field}>{field}: {message}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Customer fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="First name">
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jamie"
                maxLength={75}
                aria-invalid={showValidation && !!firstNameError}
                disabled={disabled}
                autoFocus
              />
              {showValidation && firstNameError && (
                <p className="text-sm text-destructive">{firstNameError}</p>
              )}
            </Field>
            <Field label="Middle name" optional>
              <Input
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                maxLength={75}
                aria-invalid={showValidation && !!middleNameError}
                disabled={disabled}
              />
              {showValidation && middleNameError && (
                <p className="text-sm text-destructive">{middleNameError}</p>
              )}
            </Field>
            <Field label="Last name">
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Santos"
                maxLength={75}
                aria-invalid={showValidation && !!lastNameError}
                disabled={disabled}
              />
              {showValidation && lastNameError && (
                <p className="text-sm text-destructive">{lastNameError}</p>
              )}
            </Field>

            <Field label="Contact number" className="sm:col-span-1">
              <Input
                type="tel"
                inputMode="tel"
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
                placeholder="09171234567"
                maxLength={20}
                aria-invalid={showValidation && !!contactError}
                disabled={disabled}
              />
              {showValidation && contactError && (
                <p className="text-sm text-destructive">{contactError}</p>
              )}
            </Field>
            <Field label="Email" optional className="sm:col-span-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jamie@example.com"
                maxLength={100}
                aria-invalid={showValidation && !!emailError}
                disabled={disabled}
              />
              {showValidation && emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </Field>

            <Field label="Address" optional className="sm:col-span-3">
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House No., Street, Barangay, City/Municipality"
                maxLength={255}
                aria-invalid={showValidation && !!addressError}
                disabled={disabled}
                className="min-h-16 bg-background"
              />
              {showValidation && addressError && (
                <p className="text-sm text-destructive">{addressError}</p>
              )}
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
              const fieldErrors = currentVehicleErrors[index];
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
                    {showValidation && fieldErrors.vehicle_type && (
                      <p className="text-sm text-destructive">{fieldErrors.vehicle_type}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Plate number">
                      <Input
                        value={v.plate_number}
                        onChange={(e) => updateVehicle(v.key, { plate_number: e.target.value })}
                        placeholder="ABC-1234"
                        maxLength={20}
                        aria-invalid={showValidation && !!fieldErrors.plate_number}
                        disabled={submitting}
                      />
                      {showValidation && fieldErrors.plate_number && (
                        <p className="text-sm text-destructive">{fieldErrors.plate_number}</p>
                      )}
                    </Field>
                    <Field label="Manufacturer">
                      <Input
                        value={v.manufacturer}
                        onChange={(e) => updateVehicle(v.key, { manufacturer: e.target.value })}
                        placeholder="Toyota"
                        maxLength={50}
                        aria-invalid={showValidation && !!fieldErrors.manufacturer}
                        disabled={submitting}
                      />
                      {showValidation && fieldErrors.manufacturer && (
                        <p className="text-sm text-destructive">{fieldErrors.manufacturer}</p>
                      )}
                    </Field>
                    <Field label="Model">
                      <Input
                        value={v.model}
                        onChange={(e) => updateVehicle(v.key, { model: e.target.value })}
                        placeholder="Vios"
                        maxLength={50}
                        aria-invalid={showValidation && !!fieldErrors.model}
                        disabled={submitting}
                      />
                      {showValidation && fieldErrors.model && (
                        <p className="text-sm text-destructive">{fieldErrors.model}</p>
                      )}
                    </Field>
                    <Field label="Year" optional>
                      <Input
                        value={v.year_model}
                        onChange={(e) => updateVehicle(v.key, { year_model: e.target.value })}
                        placeholder="2021"
                        inputMode="numeric"
                        maxLength={4}
                        aria-invalid={showValidation && !!fieldErrors.year_model}
                        disabled={submitting}
                      />
                      {showValidation && fieldErrors.year_model && (
                        <p className="text-sm text-destructive">{fieldErrors.year_model}</p>
                      )}
                    </Field>
                    <Field label="Color" optional>
                      <Input
                        value={v.color}
                        onChange={(e) => updateVehicle(v.key, { color: e.target.value })}
                        placeholder="Silver"
                        maxLength={30}
                        aria-invalid={showValidation && !!fieldErrors.color}
                        disabled={submitting}
                      />
                      {showValidation && fieldErrors.color && (
                        <p className="text-sm text-destructive">{fieldErrors.color}</p>
                      )}
                    </Field>
                    <Field label="Current mileage" optional>
                      <Input
                        value={v.current_mileage}
                        onChange={(e) => updateVehicle(v.key, { current_mileage: e.target.value })}
                        placeholder="12000"
                        inputMode="numeric"
                        aria-invalid={showValidation && !!fieldErrors.current_mileage}
                        disabled={submitting}
                      />
                      {showValidation && fieldErrors.current_mileage && (
                        <p className="text-sm text-destructive">{fieldErrors.current_mileage}</p>
                      )}
                    </Field>
                    <Field label="VIN" optional className="sm:col-span-2">
                      <Input
                        value={v.vin_number}
                        onChange={(e) => updateVehicle(v.key, { vin_number: e.target.value })}
                        placeholder="e.g. 1HGCR2F8XHA000000"
                        maxLength={50}
                        aria-invalid={showValidation && !!fieldErrors.vin_number}
                        disabled={submitting}
                      />
                      {showValidation && fieldErrors.vin_number && (
                        <p className="text-sm text-destructive">{fieldErrors.vin_number}</p>
                      )}
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

          <DialogFooter>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || loadingDetails || !detailsLoaded}>
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}