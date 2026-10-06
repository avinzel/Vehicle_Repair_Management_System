"use client"

import { useState, useEffect } from "react";
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

// getServices is a real endpoint (GET action=services ->
// ServiceController::getServices -> Service model's getAllServices),
// confirmed routed in api.php. I don't have the Service model, so these
// field names are a guess from the service_catalog table columns seen in
// the schema (service_catalog_id, service_name, description,
// standard_labor_cost) — same situation as getAvailableMechanics before
// its real shape was confirmed. Tighten normalizeService once a real
// response is pasted.
function normalizeService(raw) {
  return {
    id: raw.service_catalog_id ?? raw.id,
    name: raw.service_name ?? raw.name,
    laborCost: Number(raw.standard_labor_cost ?? raw.laborCost ?? 0),
  };
}

// --- Diagnostician view: filing (or revising) diagnosis + required services ---
// Shared by both "not yet submitted" (Pending/Awaiting Diagnosis) and
// "already submitted, still editable" (Pending Mechanics) — only the
// button label and initial field values differ, so one component covers
// both rather than duplicating the form.
function DiagnosisFormStage({ order, onUpdateOrder, isUpdate }) {
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedServices, setSelectedServices] = useState([]);
  const [notes, setNotes] = useState(order.diagnosticNotes ?? "");
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Ids of services already saved on this order. Only needed in update mode.
  // null = still loading. The assigned-orders SP doesn't return services, and
  // normalizeOrder drops the ids anyway, so we read them from the detail endpoint.
  const [existingServiceIds, setExistingServiceIds] = useState(isUpdate ? null : []);

  // The backend needs the numeric order id, not "RO-1050".
  const numericOrderId = order.rawId ?? order.id;

  // 1. Service catalog
  useEffect(() => {
    let cancelled = false;
    setLoadingCatalog(true);

    fetch(`http://localhost:8000/api.php?action=services`, { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (Array.isArray(json.data)) {
          setCatalog(json.data.map(normalizeService));
        } else {
          console.error("Failed to fetch service catalog:", json.error ?? json);
        }
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to fetch service catalog:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Update mode only: fetch the services already saved on this order
  useEffect(() => {
    if (!isUpdate) return;
    let cancelled = false;

    fetch(
      `http://localhost:8000/api.php?action=repair-orders&category=active&order_id=${encodeURIComponent(numericOrderId)}`,
      { credentials: "include" }
    )
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const detail = Array.isArray(json.data) ? json.data[0] : json.data;
        let services = detail?.services;
        // The SP builds this column with CONCAT, so it may arrive as a JSON string.
        if (typeof services === "string") {
          try {
            services = JSON.parse(services);
          } catch {
            services = [];
          }
        }
        setExistingServiceIds(
          Array.isArray(services) ? services.map((s) => s.service_catalog_id) : []
        );
      })
      .catch((err) => {
        console.error("Failed to fetch existing services:", err);
        if (!cancelled) setExistingServiceIds([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isUpdate, numericOrderId]);

  // 3. Hydrate once both the catalog and (in update mode) existing ids are ready
  useEffect(() => {
    if (hydrated || catalog.length === 0 || existingServiceIds === null) return;
    const existingNames = order.requiredServices ?? [];
    setSelectedServices(
      catalog.filter(
        (s) => existingServiceIds.includes(s.id) || existingNames.includes(s.name)
      )
    );
    setHydrated(true);
  }, [catalog, hydrated, existingServiceIds, order.requiredServices]);

  const availableServices = catalog.filter(
    (s) => !selectedServices.some((sel) => sel.id === s.id)
  );

  function addService(serviceId) {
    const service = catalog.find((s) => String(s.id) === serviceId);
    if (!service) return;
    setSelectedServices((prev) => [...prev, service]);
  }

  function removeService(serviceId) {
    setSelectedServices((prev) => prev.filter((s) => s.id !== serviceId));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(
        "http://localhost:8000/api.php?action=repair-orders&post-method=submit-diagnosis",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: Number(numericOrderId),
            diagnostic_notes: notes.trim(),
            required_services: selectedServices.map((s) => s.id),
          }),
        }
      );
      const json = await response.json().catch(() => ({}));

      if (!response.ok || (json.status && json.status !== "success")) {
        throw new Error(json.error ?? json.message ?? `Request failed (HTTP ${response.status})`);
      }

      // Backend succeeded. Mirror the change locally so the drawer and list
      // update immediately. The parent's re-fetch will confirm it.
      onUpdateOrder(order.id, {
        requiredServices: selectedServices.map((s) => s.name),
        requiredServiceIds: selectedServices.map((s) => s.id),
        diagnosticNotes: notes.trim(),
        status: "PENDING_MECHANICS",
      });
    } catch (err) {
      console.error("Failed to submit diagnosis:", err);
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const formLoading = loadingCatalog || existingServiceIds === null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 text-primary/80 rounded-lg p-3 text-sm">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Record your initial inspection findings here. Include observed symptoms, root cause
          analysis, and all required services.
        </p>
      </div>
      {order.complaint && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground tracking-wide mb-2">
            Customer Complaint
          </h3>
          <p className="text-sm bg-secondary/50 rounded-lg p-3">{order.complaint}</p>
        </div>
      )}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground tracking-wide ">
          Required Services
        </h3>
        <Select value="" onValueChange={addService} disabled={formLoading || submitting}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue
              placeholder={
                formLoading
                  ? "Loading services..."
                  : selectedServices.length > 0
                    ? `${selectedServices.length} service${selectedServices.length === 1 ? "" : "s"} selected`
                    : "Select applicable services..."
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availableServices.map((service) => (
              <SelectItem key={service.id} value={String(service.id)}>
                {service.name}
              </SelectItem>
            ))}
            {!formLoading && availableServices.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">All services added.</p>
            )}
          </SelectContent>
        </Select>

        {selectedServices.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedServices.map((service) => (
              <Badge key={service.id} className="bg-primary/5 border border-primary/15 text-primary gap-1 pr-1">
                {service.name}
                <button
                  type="button"
                  onClick={() => removeService(service.id)}
                  disabled={submitting}
                  aria-label={`Remove ${service.name}`}
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
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide ">
          Diagnostic Notes
        </h3>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={submitting}
          placeholder="e.g. Customer reports engine misfiring at idle. Initial inspection shows fouled spark plugs and clogged air filter. Fuel system contamination likely. Recommend full tune-up and fuel system cleaning..."
          className="min-h-32 bg-background"
        />
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          {submitError}
        </p>
      )}

      <Button
        type="button"
        className="w-full"
        disabled={submitting || formLoading || selectedServices.length === 0 || notes.trim() === ""}
        onClick={handleSubmit}
      >
        {submitting
          ? isUpdate ? "Updating..." : "Submitting..."
          : isUpdate ? "Update Diagnosis" : "Submit Diagnosis"}
      </Button>
    </div>
  );
}

const API = "http://localhost:8000/api.php";

function useOrderParts(orderRawId, enabled) {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || orderRawId == null) return;
    let cancelled = false;
    setLoading(true);
    fetch(
      `${API}?action=repair-orders&category=parts-by-order&order_id=${encodeURIComponent(orderRawId)}`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setParts(json.status === "success" && Array.isArray(json.data) ? json.data : []);
      })
      .catch(() => !cancelled && setParts([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [orderRawId, enabled]);

  return { parts, loading };
}


// --- Repair-team view: everyone else (Lead Mechanic, Assistant, or the
// Diagnostician once the job has moved past their own stage — or, on
// pages that force the team view via allowDiagnosisForm=false, the
// Diagnostician too). Shows the crew roster, diagnosis (or a prompt to go
// file it), and parts logging. ---
function RepairTeamStage({ order, onUpdateOrder, currentUserName, myPositionOnThisJob, onLogParts, onOpenDiagnosticLog, onRequestComplete }) {
  const statusLabel = formatStatusLabel(order.status);

  // Only an in-progress job can be marked complete from here; later
  // stages (Awaiting Payment, Ready for Release, Completed) are read-only
  // from the mechanic's side — those are advisor/billing actions.
  // Only the Lead Mechanic on this job can do it (the advisor-side stage
  // text says the same). NOTE: sp_mark_ready_to_invoice does not check the
  // caller's position, so this gate is UI-only for now.
  const isLeadMechanic = myPositionOnThisJob === "Lead Mechanic";
  const canMarkComplete = statusLabel === "In Progress" && isLeadMechanic;
  const showLeadOnlyHint = statusLabel === "In Progress" && !isLeadMechanic;

  // Parts only make sense once a diagnosis has scoped the job and repair
  // work has actually started — showing this on Awaiting Diagnosis or
  // Pending Mechanics would let someone log parts for work that hasn't
  // been defined yet.
  const canLogParts = statusLabel === "In Progress" || statusLabel === "Awaiting Parts";

  // The parts endpoint needs the numeric order id, not "RO-1050".
  const numericOrderId = order.rawId ?? order.id;
  const { parts, loading: partsLoading } = useOrderParts(numericOrderId, canLogParts);
  const partsTotal = parts.reduce((sum, p) => sum + Number(p.subtotal ?? 0), 0);


  // If I'm the Diagnostician on this job and no notes exist yet, this
  // page shouldn't let me fill them in inline (that's Diagnostic Log's
  // job) — show a prompt to go there instead of the generic "waiting on
  // someone else" message.
  const iAmTheDiagnosticianStillPending = !order.diagnosticNotes && myPositionOnThisJob === "Diagnostician";

  return (
    <div className="space-y-6">

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide mb-3 ">
          Team on this Job
        </h3>
        <div className="space-y-2">
          {(order.team ?? []).map((member) => {
            const isYou = member.name === currentUserName;
            return (
              <div
                key={member.id ?? member.name}
                className={`flex items-center justify-between rounded-lg p-3 border ${isYou ? "bg-primary/5 border-primary/30" : "bg-secondary/50 border-transparent"
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
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide mb-3">
          Diagnostic Notes
        </h3>
        {order.diagnosticNotes ? (
          <p className="text-sm bg-primary/5 border border-primary/15 text-primary/80 rounded-lg p-3">
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

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide mb-3">
          Repair Parts
        </h3>
        {partsLoading ? (
          <p className="text-sm text-muted-foreground">Loading parts...</p>
        ) : parts.length > 0 ? (
          <div className="space-y-2">
            {parts.map((part) => (
              <div key={part.order_part_id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{part.part_name}</p>
                  <p className="text-xs text-muted-foreground">
                    qty {part.quantity_used}
                    {part.part_status === "PENDING_PARTS" && " · pending stock"}
                  </p>
                </div>
                <span className="font-medium">
                  ₱{Number(part.subtotal ?? 0).toLocaleString("en-PH")}
                </span>
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
          className="w-full bg-primary text-white"
          onClick={() => onRequestComplete?.(order.id)}
        >
          ✓ Mark Job Complete — Ready for Billing
        </Button>
      )}

      {showLeadOnlyHint && (
        <p className="text-xs text-muted-foreground">
          Only the Lead Mechanic can mark this job complete.
        </p>
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