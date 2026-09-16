"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { MechanicChip } from "@/components/MechanicChip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const STATUS = {
  PENDING_DIAGNOSIS: "PENDING_DIAGNOSIS",
  AWAITING_DIAGNOSIS: "AWAITING_DIAGNOSIS",
  PENDING_MECHANICS: "PENDING_MECHANICS",
  IN_PROGRESS: "IN_PROGRESS",
  PENDING_PARTS: "PENDING_PARTS",
  READY_TO_INVOICE: "READY_TO_INVOICE",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  READY_FOR_RELEASE: "READY_FOR_RELEASE",
  COMPLETED: "COMPLETED",
};

// Placeholder diagnosis output. In the real system this gets filed by the
// mechanic from their own interface (not yet built) — this stands in for
// that until Mechanic-side pages exist.
const MOCK_DIAGNOSIS = {
  requiredServices: ["Brake System Service", "Oil Change"],
  diagnosticNotes:
    "Brake lever feels spongy and brake fade noted during test ride. Front brake pads worn below minimum. Rear brake fluid contaminated. Recommend brake pad replacement and full brake fluid flush.",
};

// Mock data: In your real app, this comes from a backend fetch or props
const MOCK_MECHANICS = [
  { id: "mech-1", name: "Sarah Connor", role: "Diagnostician", status: "Active" },
  { id: "mech-2", name: "Mike Smith", role: "Electrical Specialist", status: "Active" },
  { id: "mech-3", name: "John Doe", role: "Diagnostician", status: "Active" },
  { id: "mech-4", name: "Alex Wong", role: "Diagnostician", status: "Active" },
]

// --- Fully built: Pending Diagnosis ---
function AssignDiagnosticianStage({ order, onUpdateOrder }) {
  const [selectedMechanicId, setSelectedMechanicId] = useState("");

  // 1. Filter logic: Keep only Active mechanics who have the Diagnostician role[cite: 1, 3]
  const activeDiagnosticians = MOCK_MECHANICS.filter(
    (mechanic) => mechanic.status === "Active" && mechanic.role === "Diagnostician"
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">
        Assigned Diagnostician
      </h3>

      <div className="flex items-center gap-3">
        {/* 2. shadcn Select Component */}
        <Select 
          value={selectedMechanicId} 
          onValueChange={setSelectedMechanicId}
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Select available diagnostician..." />
          </SelectTrigger>
          <SelectContent>
            {activeDiagnosticians.map((mechanic) => (
              <SelectItem key={mechanic.id} value={mechanic.name}>
                {mechanic.name}
              </SelectItem>
            ))}
            
            {activeDiagnosticians.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">No active diagnosticians found.</p>
            )}
          </SelectContent>
        </Select>

      </div>
        <Button
          type="button" 
          disabled={!selectedMechanicId}
          onClick={() => onAssign(orderId, selectedMechanicId)}
          className="w-full"
        >
          + Assign Diagnostician
        </Button>
    </div>
  );
}

// --- Fully built: Awaiting Diagnosis ---
// No advisor action here by design (per the target UI) — this stage
// advances when the mechanic files their notes elsewhere. The "Simulate"
// link is a dev-only stopgap for testing until that side exists; it's
// styled to look clearly out of place so it doesn't get mistaken for
// real UI.
function DiagnosisStage({ order, onUpdateOrder }) {
  const diagnostician = order.mechanics?.[0];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">
        Assigned Mechanics
      </h3>
      {diagnostician && <MechanicChip name={diagnostician.name} role={diagnostician.role} />}

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-sm">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Waiting for <strong>{diagnostician?.name ?? "the diagnostician"}</strong> to file their inspection
          notes. Mechanic assignment will be available once diagnosis is complete.
        </p>
      </div>

      <button
        type="button"
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        onClick={() =>
          onUpdateOrder(order.id, {
            status: STATUS.PENDING_MECHANICS,
            ...MOCK_DIAGNOSIS,
          })
        }
      >
        [Dev only] Simulate: mechanic files notes
      </button>
    </div>
  );
}

// --- Fully built: Pending Mechanics ---
function AssignMechanicsStage({ order, onUpdateOrder }) {
  const diagnostician = order.mechanics?.[0];

  return (
    <div className="space-y-5">
      <div className="space-y-3">
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">Diagnosis</h3>

        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3 text-sm">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>Diagnostician notes are ready — review before assigning mechanics.</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Required Services</p>
          <div className="flex flex-wrap gap-1.5">
            {(order.requiredServices ?? []).map((service) => (
              <Badge key={service} variant="secondary">
                {service}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Diagnostic Notes</p>
          <p className="text-sm bg-secondary/50 rounded-lg p-3">{order.diagnosticNotes}</p>
        </div>
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">
          Assigned Mechanics
        </h3>
        {diagnostician && <MechanicChip name={diagnostician.name} role={diagnostician.role} />}
        {/* TODO: replace with the real multi-mechanic assign-and-loop flow */}
        <Button
          type="button"
          className="w-full"
          onClick={() => onUpdateOrder(order.id, { status: STATUS.IN_PROGRESS })}
        >
          + Assign Mechanic/s
        </Button>
      </div>
    </div>
  );
}

// --- Stubs: still placeholders, same shape as before ---
function StageStub({ title, description, actionLabel, onAdvance }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm   font-semibold text-muted-foreground tracking-wide">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      {onAdvance && (
        <Button type="button" className="w-full" onClick={onAdvance}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function RepairInProgressStage({ order, onUpdateOrder }) {
  return (
    <StageStub
      title="Repair in Progress"
      description="Mechanics are working on this vehicle. Mark complete once repair and quality check pass."
      actionLabel="Mark Repair Complete"
      onAdvance={() => onUpdateOrder(order.id, { status: STATUS.READY_TO_INVOICE })}
    />
  );
}

function PendingPartsStage() {
  return (
    <StageStub
      title="Pending Parts"
      description="This order is on hold — a required part is out of stock. It resumes once Admin restocks the part."
    />
  );
}

function GenerateInvoiceStage({ order, onUpdateOrder }) {
  return (
    <StageStub
      title="Ready to Invoice"
      description="Repair complete. Generate the invoice to proceed to payment."
      actionLabel="Generate Invoice (placeholder)"
      onAdvance={() => onUpdateOrder(order.id, { status: STATUS.AWAITING_PAYMENT, amount: 5000 })}
    />
  );
}

function CollectPaymentStage({ order, onUpdateOrder }) {
  return (
    <StageStub
      title="Awaiting Payment"
      description="Invoice generated. Collect payment to release the vehicle."
      actionLabel="Collect Payment (placeholder)"
      onAdvance={() => onUpdateOrder(order.id, { status: STATUS.READY_FOR_RELEASE })}
    />
  );
}

function ReleaseVehicleStage({ order, onUpdateOrder }) {
  return (
    <StageStub
      title="Ready for Release"
      description="Payment received. Release the vehicle to the customer."
      actionLabel="Release Vehicle"
      onAdvance={() => onUpdateOrder(order.id, { status: STATUS.COMPLETED })}
    />
  );
}

function CompletedStage() {
  return (
    <StageStub
      title="Order Complete"
      description="Vehicle released and payment collected. This order is now read-only."
    />
  );
}

export const ORDER_STAGES = {
  "Pending Diagnosis": AssignDiagnosticianStage,
  "Awaiting Diagnosis": DiagnosisStage,
  "Pending Mechanics": AssignMechanicsStage,
  "In Progress": RepairInProgressStage,
  "Pending Parts": PendingPartsStage,
  "Ready to Invoice": GenerateInvoiceStage,
  "Awaiting Payment": CollectPaymentStage,
  "Ready for Release": ReleaseVehicleStage,
  Completed: CompletedStage,
};