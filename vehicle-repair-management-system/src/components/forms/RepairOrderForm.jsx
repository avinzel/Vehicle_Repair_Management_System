"use client"

import { forwardRef, useImperativeHandle, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const DEFAULT_REPAIR_ORDER_VALUES = {
  complaint: "",
};

// Pure validation function matching the CustomerForm pattern
function validateField(name, value) {
  const trimmed = (value || "").trim();

  switch (name) {
    case "complaint":
      if (!trimmed) return "Customer complaint is required";
      if (trimmed.length < 5) return "Please provide a bit more detail about the issue";
      return "";
    default:
      return "";
  }
}

const FIELD_NAMES = ["complaint"];

export const RepairOrderForm = forwardRef(function RepairOrderForm(
  { values, onFieldChange, customerData, vehicleData },
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

  // Safely format the names from the previous steps
  const customerName = [customerData?.firstName, customerData?.lastName].filter(Boolean).join(" ") || "—";
  
  // Assuming your VehicleForm uses 'make', 'model', 'year', and 'plate'
  const vehicleName = [vehicleData?.make, vehicleData?.model, vehicleData?.year].filter(Boolean).join(" ") || "—";

  return (
    <div>
      <h3 className="text-lg font-semibold mb-6">Repair Order Details</h3>

      {/* Summary Block matching image_aed8bb.png */}
      <div className="mb-6 p-4 rounded-lg bg-orange-50 border border-orange-100 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
          <div>
            <span className="text-muted-foreground mr-1">Customer:</span> 
            <span className="font-medium text-foreground">{customerName}</span>
          </div>
          <div>
            <span className="text-muted-foreground mr-1">Phone:</span> 
            <span className="font-medium text-foreground">{customerData?.phone || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground mr-1">Vehicle:</span> 
            <span className="font-medium text-foreground">{vehicleName}</span>
          </div>
          <div>
            <span className="text-muted-foreground mr-1">Plate:</span> 
            <span className="font-medium text-foreground">{vehicleData?.plateNumber || "—"}</span>
          </div>
        </div>
      </div>

      <form className="grid grid-cols-1 gap-y-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="complaint">Customer Complaint / Reported Problem</Label>
          <Textarea
            id="complaint"
            placeholder="Describe the issue reported by the customer..."
            value={values.complaint || ""}
            onChange={handleChange("complaint")}
            aria-invalid={!!showError("complaint")}
            className="min-h-[120px] resize-none"
          />
          {showError("complaint") && (
            <p className="text-sm text-destructive">{errors.complaint}</p>
          )}
        </div>

        {/* Status Notification Box */}
        <div className="p-4 rounded-lg bg-secondary/40 border border-border flex items-start gap-3 text-sm">
          <div className="mt-0.5 shrink-0">
             {/* Mocking the radio button UI from the screenshot */}
            <div className="w-4 h-4 rounded-full border border-primary flex items-center justify-center">
               <div className="w-2 h-2 bg-primary rounded-full"></div>
            </div>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            The repair order will be created with status <span className="font-bold text-foreground">"Pending Diagnosis"</span>. A diagnostician must be assigned before further work can begin.
          </p>
        </div>
      </form>
    </div>
  );
});