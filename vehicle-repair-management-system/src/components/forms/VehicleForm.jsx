"use client"

import { forwardRef, useImperativeHandle, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const VEHICLE_TYPES = ["Car", "Motorcycle", "Tricycle"];
const CURRENT_YEAR = new Date().getFullYear();

export const DEFAULT_VEHICLE_VALUES = {
  vehicleType: "Car",
  plateNumber: "",
  make: "",
  model: "",
  year: "",
  color: "",
  vinNumber: "",
};

// Pure validation function so it's easy to unit test / reuse
function validateField(name, value) {
  const trimmed = typeof value === "string" ? value.trim() : value;

  switch (name) {
    case "vehicleType":
      if (!trimmed) return "Select a vehicle type";
      return "";
    case "plateNumber":
      if (!trimmed) return "Plate number is required";
      if (trimmed.length < 5) return "Enter a valid plate number";
      return "";
    case "make":
      if (!trimmed) return "Make / brand is required";
      return "";
    case "model":
      if (!trimmed) return "Model is required";
      return "";
    case "year":
      if (!trimmed) return "Year is required";
      if (!/^\d{4}$/.test(trimmed)) return "Enter a valid 4-digit year";
      if (Number(trimmed) < 1980 || Number(trimmed) > CURRENT_YEAR + 1)
        return `Year must be between 1980 and ${CURRENT_YEAR + 1}`;
      return "";
    case "color":
      if (!trimmed) return "Color is required";
      return "";
    default:
      return "";
  }
}

const FIELD_NAMES = ["vehicleType", "plateNumber", "make", "model", "year", "color", "vinNumber"];

// `values` + `onFieldChange` come from the parent stepper so the data
// survives switching between steps. This component only owns UI-only
// state: which errors to show, and whether the user has tried to submit.
export const VehicleForm = forwardRef(function VehicleForm(
  { values, onFieldChange },
  ref
) {
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (name) => (e) => {
    const value = e.target.value;
    onFieldChange(name, value);
    if (submitted) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleTypeSelect = (type) => {
    onFieldChange("vehicleType", type);
    if (submitted) {
      setErrors((prev) => ({ ...prev, vehicleType: validateField("vehicleType", type) }));
    }
  };

  const validateAll = () => {
    const nextErrors = {};
    FIELD_NAMES.forEach((name) => {
      nextErrors[name] = validateField(name, values[name]);
    });
    setErrors(nextErrors);
    setSubmitted(true);
    return Object.values(nextErrors).every((err) => !err);
  };

  useImperativeHandle(ref, () => ({
    validate: async () => validateAll(),
    getValues: () => values,
    submit: async () => (validateAll() ? values : null),
  }));

  const showError = (name) => submitted && errors[name];

  return (
    <div>
      <h3 className="text-lg font-semibold mb-6">Vehicle Details</h3>

      <form className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        <div className="flex flex-col gap-1.5 sm:col-span-1">
          <Label>Vehicle Type</Label>
          <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Vehicle type">
            {VEHICLE_TYPES.map((type) => (
              <Button
                key={type}
                type="button"
                variant={values.vehicleType === type ? "default" : "outline"}
                onClick={() => handleTypeSelect(type)}
                aria-pressed={values.vehicleType === type}
                className="min-w-[110px]"
              >
                {type}
              </Button>
            ))}
          </div>
          {showError("vehicleType") && (
            <p className="text-sm text-destructive">{errors.vehicleType}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="plateNumber">Plate Number</Label>
          <Input
            id="plateNumber"
            placeholder="ABC-1234"
            value={values.plateNumber}
            onChange={handleChange("plateNumber")}
            aria-invalid={!!showError("plateNumber")}
            
          />
          {showError("plateNumber") && (
            <p className="text-sm text-destructive">{errors.plateNumber}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="make">Make / Brand</Label>
          <Input
            id="make"
            placeholder="Toyota"
            value={values.make}
            onChange={handleChange("make")}
            aria-invalid={!!showError("make")}
          />
          {showError("make") && (
            <p className="text-sm text-destructive">{errors.make}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            placeholder="Vios"
            value={values.model}
            onChange={handleChange("model")}
            aria-invalid={!!showError("model")}
          />
          {showError("model") && (
            <p className="text-sm text-destructive">{errors.model}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            placeholder="2021"
            inputMode="numeric"
            value={values.year}
            onChange={handleChange("year")}
            aria-invalid={!!showError("year")}
          />
          {showError("year") && (
            <p className="text-sm text-destructive">{errors.year}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            placeholder="Silver"
            value={values.color}
            onChange={handleChange("color")}
            aria-invalid={!!showError("color")}
          />
          {showError("color") && (
            <p className="text-sm text-destructive">{errors.color}</p>
          )}
        </div>

        <div className="flex flex-col col-span-2 gap-1.5">
          <Label htmlFor="vinNumber">Vehicle Identification Number (optional)</Label>
          <Input
            id="vinNumber"
            placeholder="e.g., 1HGCR2F8XHA000000"
            value={values.vinNumber}
            onChange={handleChange("vinNumber")}
            aria-invalid={!!showError("vinNumber")}
            maxlength="17" 
          />
          {showError("vinNumber") && (
            <p className="text-sm text-destructive">{errors.vinNumber}</p>
          )}
        </div>
      </form>
    </div>
  );
});