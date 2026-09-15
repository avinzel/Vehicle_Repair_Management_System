"use client";
import { useOutletContext } from "react-router";
import { VehicleIntakeStepper } from "@/components/VehicleIntakeStepper";

export default function IntakePage() {
  // 1. Fallback default empty object to prevent destructured runtime errors if context is undefined
  const { getTableData, getCardData } = useOutletContext() || {};

  return (
    <div className="space-y-6">
      <VehicleIntakeStepper 
        getTableData={getTableData} 
        getCardData={getCardData} 
      />
    </div>
  );
}