"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Info, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatStatusLabel } from "@/utils/formatStatusLabel";

// Placeholder service catalog for the Required Services multi-select.
// TODO: replace with a real fetch once a services/catalog endpoint exists —
// same "backend not built yet" situation as AssignedOrders' mock data.
const MOCK_SERVICE_CATALOG = [
  "Brake System Service",
  "Oil Change",
  "Tune-Up Service",
  "Battery Replacement",
  "Tire Replacement",
  "Chain & Sprocket Service",
];

// --- Diagnostician view: filing (or revising) diagnosis + required services ---
// Shared by both "not yet submitted" (Pending/Awaiting Diagnosis) and
// "already submitted, still editable" (Pending Mechanics) — only the
// button label and initial field values differ, so one component covers
// both rather than duplicating the form.
function DiagnosisFormStage({ order, onUpdateOrder, isUpdate }) {
  const [selectedServices, setSelectedServices] = useState(order.requiredServices ?? []);
  const [notes, setNotes] = useState(order.diagnosticNotes ?? "");

  const availableServices = MOCK_SERVICE_CATALOG.filter((s) => !selectedServices.includes(s));

  function addService(service) {
    if (!service) return;
    setSelectedServices((prev) => [...prev, service]);
  }

  function removeService(service) {
    setSelectedServices((prev) => prev.filter((s) => s !== service));
  }

  function handleSubmit() {
    onUpdateOrder(order.id, {
      requiredServices: selectedServices,
      diagnosticNotes: notes,
      status: "PENDING_MECHANICS",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3 text-sm">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Record your initial inspection findings here. Include observed symptoms, root cause
          analysis, and all required services. This will be shared with the full repair crew and
          used to generate the invoice.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
          Required Services
        </h3>
        <Select value="" onValueChange={addService}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue
              placeholder={
                selectedServices.length > 0
                  ? `${selectedServices.length} service${selectedServices.length === 1 ? "" : "s"} selected`
                  : "Select applicable services..."
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availableServices.map((service) => (
              <SelectItem key={service} value={service}>
                {service}
              </SelectItem>
            ))}
            {availableServices.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">All services added.</p>
            )}
          </SelectContent>
        </Select>

        {selectedServices.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedServices.map((service) => (
              <Badge key={service} variant="secondary" className="gap-1 pr-1">
                {service}
                <button
                  type="button"
                  onClick={() => removeService(service)}
                  aria-label={`Remove ${service}`}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
          Diagnostic Notes
        </h3>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Customer reports engine misfiring at idle. Initial inspection shows fouled spark plugs and clogged air filter. Fuel system contamination likely. Recommend full tune-up and fuel system cleaning..."
          className="min-h-32 bg-background"
        />
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={selectedServices.length === 0 || notes.trim() === ""}
        onClick={handleSubmit}
      >
        {isUpdate ? "Update Diagnosis" : "Submit Diagnosis"}
      </Button>
    </div>
  );
}

// --- Repair-team view: everyone else (Lead Mechanic, Assistant, or the
// Diagnostician once the job has moved past their own stage — or, on
// pages that force the team view via allowDiagnosisForm=false, the
// Diagnostician too). Shows the crew roster, diagnosis (or a prompt to go
// file it), and parts logging. ---
function RepairTeamStage({ order, onUpdateOrder, currentUserName, myPositionOnThisJob, onLogParts, onOpenDiagnosticLog }) {
  const statusLabel = formatStatusLabel(order.status);
  const parts = order.partsLogged ?? [];
  const partsTotal = parts.reduce((sum, p) => sum + (p.cost ?? 0) * (p.qty ?? 1), 0);

  // Only an in-progress job can be marked complete from here; later
  // stages (Awaiting Payment, Ready for Release, Completed) are read-only
  // from the mechanic's side — those are advisor/billing actions.
  const canMarkComplete = statusLabel === "In Progress";
  
  // Parts only make sense once a diagnosis has scoped the job and repair
  // work has actually started — showing this on Awaiting Diagnosis or
  // Pending Mechanics would let someone log parts for work that hasn't
  // been defined yet.
  const canLogParts = statusLabel === "In Progress" || statusLabel === "Awaiting Parts";


  // If I'm the Diagnostician on this job and no notes exist yet, this
  // page shouldn't let me fill them in inline (that's Diagnostic Log's
  // job) — show a prompt to go there instead of the generic "waiting on
  // someone else" message.
  const iAmTheDiagnosticianStillPending = !order.diagnosticNotes && myPositionOnThisJob === "Diagnostician";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground tracking-wide mb-3 uppercase">
          Team on this Job
        </h3>
        <div className="space-y-2">
          {(order.team ?? []).map((member) => {
            const isYou = member.name === currentUserName;
            return (
              <div
                key={member.id ?? member.name}
                className={`flex items-center justify-between rounded-lg p-3 border ${
                  isYou ? "bg-primary/5 border-primary/30" : "bg-secondary/50 border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {member.name?.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">
                    {member.name}
                    {isYou ? " (you)" : ""}
                  </span>
                </div>
                <Badge variant="outline">{member.role}</Badge>
              </div>
            );
          })}
          {(!order.team || order.team.length === 0) && (
            <p className="text-sm text-muted-foreground">No mechanics assigned yet.</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground tracking-wide mb-3 uppercase">
          Diagnostic Notes
        </h3>
        {order.diagnosticNotes ? (
          <p className="text-sm bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3">
            {order.diagnosticNotes}
          </p>
        ) : iAmTheDiagnosticianStillPending ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground italic">
              No diagnosis logged yet. You are assigned as Diagnostician.
            </p>
            <Button type="button" className="w-full" onClick={() => onOpenDiagnosticLog?.(order.id)}>
              Open Diagnostic Log →
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Awaiting diagnosis from the assigned Diagnostician.
          </p>
        )}
      </div>

      {canLogParts && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wide mb-3 uppercase">
            Parts Logged
          </h3>
          {parts.length > 0 ? (
            <div className="space-y-2">
              {parts.map((part, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{part.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Logged by {part.loggedBy} · qty {part.qty}
                    </p>
                  </div>
                  <span className="font-medium">₱{(part.cost ?? 0).toLocaleString("en-PH")}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t border-border">
                <span>Parts Total</span>
                <span>₱{partsTotal.toLocaleString("en-PH")}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No parts logged yet.</p>
          )}
        </div>
      )}

      {canLogParts && (
        <Button
          type="button"
          variant="outline"
          className="w-full border-primary text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => onLogParts?.(order.id)}
        >
          + Log Parts Used
        </Button>
      )}

      {canMarkComplete && (
        <Button
          type="button"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          onClick={() => onUpdateOrder(order.id, { status: "READY_TO_INVOICE" })}
        >
          ✓ Mark Job Complete — Ready for Billing
        </Button>
      )}
    </div>
  );
}

// Resolver: decides which stage to render AND which header layout goes
// with it (see MechanicOrderDetail). A Diagnostician sees the diagnosis
// form for their own stage; everyone else — and the Diagnostician too,
// once the job moves past Pending Mechanics — sees the team/parts view.
//
// Position is derived per-order from that order's own team roster, not
// from a page-level "current user's position" constant. This supports
// dynamic mechanic positioning: the same person can be a Diagnostician on
// one order and a Lead Mechanic (or not on the team at all) on another —
// there is no single "my position" that would be valid across every order.
//
// allowDiagnosisForm: pages that host the actual fill-in-diagnosis UI
// (Diagnostic Log) pass true (the default). Pages that only summarize a
// job (Assigned Orders) pass false, so the Diagnostician always gets the
// team view with a "go log it" prompt instead — the editable form only
// ever renders on the page meant for it.
export function resolveMechanicStage(order, currentUserName, { allowDiagnosisForm = true } = {}) {
  const statusLabel = formatStatusLabel(order.status);
  const myPositionOnThisJob = getMyPositionOnOrder(order, currentUserName);
  const isDiagnosticianRole = myPositionOnThisJob === "Diagnostician";

  if (allowDiagnosisForm && isDiagnosticianRole && (statusLabel === "Pending Diagnosis" || statusLabel === "Awaiting Diagnosis")) {
    return { kind: "diagnosis", Component: DiagnosisFormStage, isUpdate: false };
  }

  if (allowDiagnosisForm && isDiagnosticianRole && statusLabel === "Pending Mechanics") {
    return { kind: "diagnosis", Component: DiagnosisFormStage, isUpdate: true };
  }

  return { kind: "team", Component: RepairTeamStage, isUpdate: false };
}

// Shared lookup — same logic MechanicOrderDetail needs for its header
// badge, so both read from one place rather than reimplementing the find.
export function getMyPositionOnOrder(order, currentUserName) {
  return order.team?.find((m) => m.name === currentUserName)?.role ?? null;
}