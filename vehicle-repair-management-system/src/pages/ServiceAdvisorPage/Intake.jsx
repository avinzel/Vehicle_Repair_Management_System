"use client";
import { useLocation, useOutletContext } from "react-router";
import { VehicleIntakeStepper } from "@/components/VehicleIntakeStepper";

export default function IntakePage() {
  // Fallback default empty object to prevent destructured runtime errors if context is undefined
  const { getTableData, getCardData } = useOutletContext() || {};

  // Set by CustomerDetail's "New Repair Order" button via navigate(..., { state: { intakeContext } })
  const location = useLocation();
  const intakeContext = location.state?.intakeContext ?? null;

  return (
    <div className="space-y-6">
      {/* key={location.key} remounts the stepper on every fresh navigation,
          so each visit starts from the correct step with clean state. */}
      <VehicleIntakeStepper
        key={location.key}
        getTableData={getTableData}
        getCardData={getCardData}
        intakeContext={intakeContext}
      />
    </div>
  );
}