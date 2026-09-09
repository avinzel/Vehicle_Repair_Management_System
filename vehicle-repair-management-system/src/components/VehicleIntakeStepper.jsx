"use client"
import { ChevronRight } from "lucide-react";
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

export function VehicleIntakeStepper() {
  const [current, setCurrent] = useState(1);

  // Single source of truth for all step data, lifted out of the
  // individual form components so it survives switching steps.
  const [formData, setFormData] = useState({
    customer: DEFAULT_CUSTOMER_VALUES,
    vehicle: DEFAULT_VEHICLE_VALUES,
    order: DEFAULT_REPAIR_ORDER_VALUES,
  });

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

  const goBack = () => setCurrent((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    const valid = await orderRef.current?.validate();
    if (!valid) return;
    console.log("Create Repair Order", formData);
  };

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
                {/* Step block: row layout, no fixed width so text doesn't force wrapping */}
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

                {/* Connector: flexible line between step blocks, aligned to circle center */}
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
                {/* Card wrapper to match target's bordered panel look */}
                <div className="w-full rounded-xl border border-border bg-card p-6">
                  <Component
                    ref={ref}
                    values={formData[section]}
                    onFieldChange={updateField(section)}
                    customerData={formData.customer} 
                    vehicleData={formData.vehicle}
                  />

                  <div className="flex justify-between items-center w-full mt-6">
                    <div />
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        onClick={goBack}
                        disabled={current === 1}
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