"use client"
import { ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperTitle,
  StepperTrigger,
} from "@/components/reui/stepper"
import { CustomerForm, DEFAULT_CUSTOMER_VALUES } from "@/components/forms/CustomerForm";
import { VehicleForm, DEFAULT_VEHICLE_VALUES } from "@/components/forms/VehicleForm";
import { RepairOrderForm, DEFAULT_REPAIR_ORDER_VALUES } from "@/components/forms/RepairOrderForm";

import { useState, useRef } from "react";

const steps = [
  { title: "Customer Info", component: CustomerForm },
  { title: "Vehicle Details", component: VehicleForm },
  { title: "Repair Order", component: RepairOrderForm },
];

// Maps a registered vehicle (from CustomerDetail's normalized data) onto the
// VehicleForm field names. The DB stores CAR/MOTORCYCLE/TRICYCLE; the form
// buttons use "Car"/"Motorcycle"/"Tricycle".
const vehicleToFormValues = (v) => ({
  ...DEFAULT_VEHICLE_VALUES,
  vehicleType: v.vehicleType
    ? v.vehicleType.charAt(0).toUpperCase() + v.vehicleType.slice(1).toLowerCase()
    : "Car",
  plateNumber: v.plateNumber ?? "",
  make: v.make ?? "",
  model: v.model ?? "",
  year: v.year != null ? String(v.year) : "",
  color: v.color ?? "",
  vinNumber: v.vinNumber ?? "",
  currentMileage: v.currentMileage != null ? String(v.currentMileage) : "",
});

// intakeContext (optional) comes from Customer Records -> "New Repair Order":
// { source, customer: {id, firstName, middleName, lastName, phone, email, address},
//   vehicles: [{id, make, model, year, plateNumber, vehicleType, ...}] }
export function VehicleIntakeStepper({ getTableData, getCardData, intakeContext }) {
  const ctx = intakeContext ?? null;

  // Customer pre-filled from Customer Records => step 1 is already done.
  const [lockedCustomer, setLockedCustomer] = useState(ctx?.customer ?? null);
  const [knownVehicles, setKnownVehicles] = useState(ctx?.vehicles ?? []);
  // null = "Enter a new vehicle"; otherwise the id of the picked existing vehicle.
  const [selectedVehicleId, setSelectedVehicleId] = useState(ctx?.vehicles?.[0]?.id ?? null);
  const [current, setCurrent] = useState(ctx ? 2 : 1);

  // Single source of truth for all step data, lifted out of the
  // individual form components so it survives switching steps.
  const [formData, setFormData] = useState(() => ({
    customer: ctx
      ? {
          ...DEFAULT_CUSTOMER_VALUES,
          firstName: ctx.customer.firstName ?? "",
          middleName: ctx.customer.middleName ?? "",
          lastName: ctx.customer.lastName ?? "",
          phone: ctx.customer.phone ?? "",
          email: ctx.customer.email ?? "",
          address: ctx.customer.address ?? "",
        }
      : DEFAULT_CUSTOMER_VALUES,
    vehicle: ctx?.vehicles?.[0] ? vehicleToFormValues(ctx.vehicles[0]) : DEFAULT_VEHICLE_VALUES,
    order: DEFAULT_REPAIR_ORDER_VALUES,
  }));

  // Success screen state (shown in place of the stepper after submit)
  const [completed, setCompleted] = useState(false);
  const [summary, setSummary] = useState({ customer: "", vehicle: "", status: "Pending Diagnosis" });

  const customerRef = useRef(null);
  const vehicleRef = useRef(null);
  const orderRef = useRef();

  const refForStep = (step) =>
    step === 1 ? customerRef : step === 2 ? vehicleRef : orderRef;

  const updateField = (section) => (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section], [name]: value },
    }));
  };

  const goNext = async () => {
    const ref = refForStep(current);
    // Validate the active step first; only advance if it passes.
    const valid = await ref.current?.validate();
    if (valid) {
      setCurrent((s) => Math.min(s + 1, steps.length));
    }
  };

  // In the locked-customer flow, step 1 was never filled by hand, so don't
  // let Back drop the user into it. They use "Change customer" instead.
  const backDisabled = current === 1 || (!!lockedCustomer && current === 2);

  const goBack = () => {
    if (backDisabled) return;
    setCurrent((s) => Math.max(s - 1, 1));
  };

  const handleSelectVehicle = (id) => {
    setSelectedVehicleId(id);
    const v = knownVehicles.find((x) => x.id === id);
    setFormData((prev) => ({
      ...prev,
      vehicle: v ? vehicleToFormValues(v) : DEFAULT_VEHICLE_VALUES,
    }));
  };

  const handleChangeCustomer = () => {
    setLockedCustomer(null);
    setKnownVehicles([]);
    setSelectedVehicleId(null);
    setFormData({
      customer: DEFAULT_CUSTOMER_VALUES,
      vehicle: DEFAULT_VEHICLE_VALUES,
      order: DEFAULT_REPAIR_ORDER_VALUES,
    });
    setCurrent(1);
  };

  const handleSubmit = async () => {
    const valid = await orderRef.current?.validate();
    if (!valid) return;

    const response = await fetch("http://localhost:8000/api.php?action=repair-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
      credentials: "include",
    });

    let data = await response.json();
    if (!response.ok) {
      alert(data["error"]);
    } else {
      // Snapshot before the form is reset. Adjust field names to match your forms.
      const c = formData.customer;
      const v = formData.vehicle;
      setSummary({
        customer: (c.name || [c.firstName, c.lastName].filter(Boolean).join(" ")).toUpperCase(),
        vehicle: [v.make, v.model, v.year].filter(Boolean).join(" "),
        status: "Pending Diagnosis",
      });
      setCompleted(true);
      setFormData({
        customer: DEFAULT_CUSTOMER_VALUES,
        vehicle: DEFAULT_VEHICLE_VALUES,
        order: DEFAULT_REPAIR_ORDER_VALUES,
      });
      // "Create Another Order" starts a normal, fresh intake.
      setLockedCustomer(null);
      setKnownVehicles([]);
      setSelectedVehicleId(null);
      setCurrent(1);
      if (typeof getCardData === "function") await getCardData();
      if (typeof getTableData === "function") await getTableData();
    }
  };

  if (completed) {
    return (
      <div className="w-full max-w-5xl mx-auto p-6 flex justify-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Check className="h-9 w-9 text-primary" strokeWidth={2.5} />
          </div>

          <h2 className="mt-4 text-xl font-bold">Repair Order Created!</h2>

          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p>Customer: <span className="font-medium text-foreground">{summary.customer}</span></p>
            <p>Vehicle: <span className="font-medium text-foreground">{summary.vehicle}</span></p>
            <p className="flex items-center justify-center gap-2">
              Status:
              <span className="rounded-full border border-yellow-300 bg-yellow-50 px-3 py-0.5 text-xs font-medium text-yellow-800">
                {summary.status}
              </span>
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            className="mt-6 w-full"
            onClick={() => setCompleted(false)}
          >
            Create Another Order
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6">
      <Stepper value={current} onValueChange={setCurrent} className="w-full">
        {/* NAV: indicator + title sit side-by-side, connectors run through the middle */}
        <StepperNav className="flex items-center w-full max-w-3xl mx-auto mb-6">
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            const isConnectorFilled = i + 1 < current;

            return (
              <div
                key={i}
                className={`flex items-center ${isLast ? "" : "flex-1"}`}
              >
                <StepperItem step={i + 1} className="flex items-center">
                  <StepperTrigger className="flex items-center pointer-events-none gap-3" tabIndex={-1}>
                    <StepperIndicator
                      className="
                        group flex items-center justify-center shrink-0
                        w-9 h-9 rounded-full border-2 border-border
                        bg-background text-foreground
                        data-[state=active]:bg-primary data-[state=active]:border-primary data-[state=active]:text-primary-foreground
                        data-[state=completed]:bg-primary data-[state=completed]:border-primary data-[state=completed]:text-primary-foreground
                      "
                    >
                      <span className="font-semibold text-sm text-muted-foreground
                        group-data-[state=active]:text-primary-foreground
                        group-data-[state=completed]:text-primary-foreground">{i + 1}</span>
                    </StepperIndicator>

                    <StepperTitle
                      className="
                        font-semibold text-sm whitespace-nowrap
                        data-[state=inactive]:text-muted-foreground
                        data-[state=active]:text-primary
                        data-[state=completed]:text-primary
                      "
                    >
                      {step.title}
                    </StepperTitle>
                  </StepperTrigger>
                </StepperItem>

                {!isLast && (
                  <div
                    aria-hidden
                    className={`flex-1 h-[2px] mx-4 ${
                      isConnectorFilled ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </StepperNav>

        {/* PANELS */}
        <StepperPanel className="w-full">
          {steps.map((step, i) => {
            const Component = step.component;
            const ref = refForStep(i + 1);
            const section = i === 0 ? "customer" : i === 1 ? "vehicle" : "order";

            return (
              <StepperContent
                key={i}
                value={i + 1}
                className="flex flex-col gap-6 w-full"
              >
                <div className="w-full rounded-xl border border-border bg-card p-6">
                  {/* Customer banner: step 1 was prefilled from Customer Records */}
                  {i === 1 && lockedCustomer && (
                    <div className="mb-6 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          {lockedCustomer.firstName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {[lockedCustomer.firstName, lockedCustomer.lastName].filter(Boolean).join(" ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[lockedCustomer.phone, lockedCustomer.email].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleChangeCustomer}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Change customer
                      </button>
                    </div>
                  )}

                  <Component
                    ref={ref}
                    values={formData[section]}
                    onFieldChange={updateField(section)}
                    customerData={formData.customer}
                    vehicleData={formData.vehicle}
                    existingVehicles={knownVehicles}
                    selectedVehicleId={selectedVehicleId}
                    onSelectVehicle={handleSelectVehicle}
                  />

                  <div className="flex justify-between items-center w-full mt-6">
                    <div />
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        onClick={goBack}
                        disabled={backDisabled}
                        className="min-w-[100px]"
                      >
                        Back
                      </Button>

                      {i + 1 < steps.length ? (
                        <Button
                          type="button"
                          size="lg"
                          onClick={goNext}
                          className="min-w-[170px] gap-1 whitespace-nowrap"
                        >
                          Next: {steps[i + 1].title}
                          <ChevronRight className="w-4 h-4 shrink-0" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="lg"
                          onClick={handleSubmit}
                          className="min-w-[170px] whitespace-nowrap"
                        >
                          Create Repair Order
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </StepperContent>
            );
          })}
        </StepperPanel>
      </Stepper>
    </div>
  );
}