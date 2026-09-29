"use client"

import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, Check, ChevronsUpDown, X } from "lucide-react";
import { MechanicChip } from "@/components/MechanicChip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export const STATUS = {
  PENDING_DIAGNOSIS: "PENDING_DIAGNOSIS",
  AWAITING_DIAGNOSIS: "AWAITING_DIAGNOSIS",
  PENDING_MECHANICS: "PENDING_MECHANICS",
  IN_PROGRESS: "IN_PROGRESS",
  // Was PENDING_PARTS — didn't match the actual DB enum (AWAITING_PARTS),
  // which the Mechanic-side pages were already built against. Fixed here
  // so both sides agree.
  AWAITING_PARTS: "AWAITING_PARTS",
  READY_TO_INVOICE: "READY_TO_INVOICE",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  READY_FOR_RELEASE: "READY_FOR_RELEASE",
  // Was COMPLETED — didn't match the actual DB enum (FULFILLED). Same
  // class of bug as PENDING_PARTS/AWAITING_PARTS above: StatusBadge's
  // style map already has a 'Fulfilled' key, not 'Completed', so
  // formatStatusLabel("FULFILLED") produces "Fulfilled" — the old
  // ORDER_STAGES key "Completed" would never have matched it, meaning
  // any FULFILLED order's drawer would have hit the "Unknown status"
  // fallback instead of CompletedStage.
  FULFILLED: "FULFILLED",
};

// Positions selectable when building out the rest of the repair team.
// Diagnostician is intentionally excluded — that assignment happens in
// AssignDiagnosticianStage, one stage earlier, and is locked in by the
// time AssignMechanicsStage runs.
// TODO: still mocked — AssignMechanicsStage hasn't been wired to a real
// backend endpoint yet (this task was scoped to Assign Diagnostician +
// Diagnosis stage only). mechanic_positions is a real table per the
// schema; this should eventually come from a fetch, same as the
// Diagnostician picker below.
const MOCK_POSITIONS = ["Lead Mechanic", "Electrical Specialist", "Assistant"];

function formatCurrency(amount) {
  if (amount == null) return null;
  return `₱${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

// --- Fully built: Pending Diagnosis ---
// Fetches real available mechanics for this order (GET
// action=mechanics&available=true&order_id=X, per API_DOCUMENTATION.md ->
// MechanicController::getAvailableMechanics) and POSTs the real
// assignment (action=repair-orders&post-method=assign-diagnostician ->
// RepairOrderController::assignDiagnostician).
//
// There is deliberately NO position filter on this list. Under dynamic
// positioning, `mechanics` carries no position at all — position lives on
// each repair_order_mechanics row, per order. So there's no such thing as
// "a diagnostician mechanic"; any available mechanic can be assigned as
// this order's Diagnostician.
//
// Confirmed response shape (getAvailableMechanics -> { message, data: [...] }),
// each item: { mechanic_id, first_name, last_name, full_name,
// specialization, status }. Note there is no position anywhere on it —
// see above.
function AssignDiagnosticianStage({ order, onUpdateOrder }) {
  const [mechanics, setMechanics] = useState([]);
  const [loadingMechanics, setLoadingMechanics] = useState(true);
  const [selectedMechanicId, setSelectedMechanicId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState(null);

  const orderRawId = order.rawId ?? order.id;

  useEffect(() => {
    let cancelled = false;
    setLoadingMechanics(true);
    setError(null);

    fetch(
      `http://localhost:8000/api.php?action=mechanics&available=true&order_id=${encodeURIComponent(orderRawId)}`,
      { credentials: "include" }
    )
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.data) {
          setMechanics(json.data);
        } else {
          setError(json.error ?? "Failed to load available mechanics");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load available mechanics");
      })
      .finally(() => {
        if (!cancelled) setLoadingMechanics(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderRawId]);

  // Base UI's Select prints the raw `value` (the mechanic id) in the trigger
  // unless the Root is given an `items` list mapping each value to its label.
  // Specialization is included in the label because mechanics can share a name.
  const mechanicItems = mechanics.map((m) => ({
    value: String(m.mechanic_id),
    label: `${m.full_name}${m.specialization ? ` · ${m.specialization}` : ""}`,
  }));

  async function handleAssign() {
    setAssigning(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:8000/api.php?action=repair-orders&post-method=assign-diagnostician`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: orderRawId,
            mechanic_id: Number(selectedMechanicId),
          }),
        }
      );
      const json = await response.json();

      if (json.status === "success") {
        // assignDiagnostician doesn't return updated order data — this
        // call only exists to trigger ActiveRepairOrder's refetch, which
        // ignores the updates object entirely and always re-fetches.
        onUpdateOrder(order.id, {});
      } else {
        setError(json.error ?? "Failed to assign diagnostician");
      }
    } catch (err) {
      setError("Failed to assign diagnostician");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">
        Assigned Diagnostician
      </h3>

      {/* value is null (not "") when nothing is selected — that's Base UI's
          "no selection" state, which is what makes the placeholder show. */}
      <Select
        items={mechanicItems}
        value={selectedMechanicId || null}
        onValueChange={(value) => setSelectedMechanicId(value ?? "")}
        disabled={loadingMechanics}
      >
        <SelectTrigger className="w-full bg-background">
          <SelectValue placeholder={loadingMechanics ? "Loading mechanics..." : "Select a mechanic..."} />
        </SelectTrigger>
        <SelectContent>
          {mechanics.map((mechanic) => (
            <SelectItem key={mechanic.mechanic_id} value={String(mechanic.mechanic_id)}>
              {mechanic.full_name}
              {mechanic.specialization && (
                <span className="text-muted-foreground"> · {mechanic.specialization}</span>
              )}
            </SelectItem>
          ))}
          {!loadingMechanics && mechanics.length === 0 && (
            <p className="p-2 text-sm text-muted-foreground">No available mechanics found.</p>
          )}
        </SelectContent>
      </Select>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="button" disabled={!selectedMechanicId || assigning} onClick={handleAssign} className="w-full">
        {assigning ? "Assigning..." : "+ Assign Diagnostician"}
      </Button>
    </div>
  );
}

// --- Fully built: Awaiting Diagnosis ---
// No advisor action here by design — this stage advances when the
// mechanic files their notes from Diagnostic Log. The dev-only mock
// simulate link has been removed now that a real submitDiagnosis
// endpoint exists on the backend (RepairOrderController::submitDiagnosis)
// — it was standing in for that action, and leaving a fake version of it
// around would be actively misleading once we're wiring real data.
// NOTE: the Diagnostic Log page (Mechanic side) has NOT been wired to
// call the real endpoint yet — it's still fully mocked. Until that's
// done, an order can get stuck here with no way to actually advance it
// from this UI. See mechanic-side-handoff-summary.md.
function DiagnosisStage({ order, onUpdateOrder }) {
  const diagnostician = order.team?.[0];

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
    </div>
  );
}

// --- Fully built: Pending Mechanics ---
// This is the ONLY stage where the repair team can be built or changed —
// once the order moves to In Progress, the roster locks (see
// RepairInProgressStage below). Mechanic selection is a searchable
// combobox, never a free-text input; position is chosen independently
// per row, since a mechanic's role is per-order, not fixed to their
// profile.
function AssignMechanicsStage({ order, onUpdateOrder }) {
  const diagnostician = order.team?.[0];

  // Each row: { rowId, mechanicId, position }
  const [rows, setRows] = useState([{ rowId: crypto.randomUUID(), mechanicId: "", position: "" }]);
  const [openComboboxRowId, setOpenComboboxRowId] = useState(null);

  const alreadyAssignedIds = new Set([diagnostician?.id, ...rows.map((r) => r.mechanicId)].filter(Boolean));

  function addRow() {
    setRows((prev) => [...prev, { rowId: crypto.randomUUID(), mechanicId: "", position: "" }]);
  }

  function removeRow(rowId) {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  function updateRow(rowId, changes) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...changes } : r)));
  }

  const isComplete = rows.length > 0 && rows.every((r) => r.mechanicId && r.position);

  function handleSubmit() {
    const newTeamMembers = rows.map((r) => {
      const mechanic = MOCK_MECHANICS.find((m) => m.id === r.mechanicId);
      return { id: mechanic.id, name: mechanic.name, role: r.position };
    });

    onUpdateOrder(order.id, {
      status: STATUS.IN_PROGRESS,
      team: [...(order.team ?? []), ...newTeamMembers],
    });
  }

  return (
    <div className="space-y-5">
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
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">
          Assigned Mechanics
        </h3>
        {diagnostician && <MechanicChip name={diagnostician.name} role={diagnostician.role} />}

        {rows.map((row) => {
          const mechanic = MOCK_MECHANICS.find((m) => m.id === row.mechanicId);
          const availableMechanics = MOCK_MECHANICS.filter(
            (m) => m.status === "Active" && (!alreadyAssignedIds.has(m.id) || m.id === row.mechanicId)
          );

          return (
            <div key={row.rowId} className="flex items-center gap-2">
              <Popover
                open={openComboboxRowId === row.rowId}
                onOpenChange={(open) => setOpenComboboxRowId(open ? row.rowId : null)}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="flex-1 justify-between font-normal bg-background"
                  >
                    {mechanic ? mechanic.name : "Choose a mechanic..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search mechanics..." />
                    <CommandList>
                      <CommandEmpty>No mechanic found.</CommandEmpty>
                      <CommandGroup>
                        {availableMechanics.map((m) => (
                          <CommandItem
                            key={m.id}
                            value={m.name}
                            onSelect={() => {
                              updateRow(row.rowId, { mechanicId: m.id });
                              setOpenComboboxRowId(null);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${row.mechanicId === m.id ? "opacity-100" : "opacity-0"}`} />
                            {m.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Select value={row.position} onValueChange={(value) => updateRow(row.rowId, { position: value })}>
                <SelectTrigger className="w-44 bg-background">
                  <SelectValue placeholder="Position..." />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_POSITIONS.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {rows.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove mechanic"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeRow(row.rowId)}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={addRow}
          className="w-full text-sm text-muted-foreground border border-dashed border-border rounded-lg py-2 hover:text-foreground hover:border-foreground/40 transition-colors"
        >
          + Add Another Mechanic
        </button>

        <Button type="button" className="w-full" disabled={!isComplete} onClick={handleSubmit}>
          Assign Mechanics & Start Repair
        </Button>
      </div>
    </div>
  );
}

// --- In Progress: read-only. No "mark complete" action here — that's
// owned by the Lead Mechanic from their own interface, and the roster is
// locked once work has started. See point 1 in the accompanying
// explanation for why both of those are deliberate, not omissions. ---
function RepairInProgressStage({ order }) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">
          Assigned Mechanics
        </h3>
        {(order.team ?? []).map((member) => (
          <MechanicChip key={member.id ?? member.name} name={member.name} role={member.role} />
        ))}
        {(!order.team || order.team.length === 0) && (
          <p className="text-sm text-muted-foreground">No mechanics assigned.</p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">Diagnosis</h3>
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
      </div>

      <div className="flex items-start gap-2 bg-secondary/50 rounded-lg p-3 text-sm text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Repair is in progress. The assigned Lead Mechanic marks this job complete from their own interface.</p>
      </div>
    </div>
  );
}

function AwaitingPartsStage() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">Awaiting Parts</h3>
      <p className="text-sm text-muted-foreground">
        This order is on hold — a required part is out of stock. It resumes automatically once the part is
        restocked.
      </p>
    </div>
  );
}

// --- Invoicing-adjacent stages: financial content lives ONLY here, never
// on any other stage. Full invoice breakdown/payment collection is
// deliberately NOT built inline — these are stubs with a placeholder
// link out to a dedicated Invoice page, not yet built. See point 5. ---
function InvoicingStub({ title, description, order }) {
  const navigate = useNavigate();
  const amountLabel = formatCurrency(order.amount);

  function handleOpenInvoice() {
    const rawId = order.rawId ?? String(order.id).replace(/\D/g, "");
    navigate(`/service-advisor/billing?order_id=${encodeURIComponent(rawId)}`);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>

      {amountLabel && (
        <div className="bg-secondary/50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Amount Due</span>
          <span className="text-lg font-bold">{amountLabel}</span>
        </div>
      )}

      <Button type="button" variant="outline" className="w-full" onClick={handleOpenInvoice}>
        Open Invoice →
      </Button>
    </div>
  );
}

function GenerateInvoiceStage({ order }) {
  return (
    <InvoicingStub
      order={order}
      title="Ready to Invoice"
      description="Repair complete. Generate the invoice to proceed to payment."
    />
  );
}

function CollectPaymentStage({ order }) {
  return (
    <InvoicingStub
      order={order}
      title="Awaiting Payment"
      description="Invoice generated. Collect payment to release the vehicle."
    />
  );
}

function ReleaseVehicleStage({ order, onUpdateOrder }) {
  return (
    <InvoicingStub
      order={order}
      title="Ready for Release"
      description="Payment received. Release the vehicle to the customer."
    />
  );
}

function CompletedStage() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">Order Complete</h3>
      <p className="text-sm text-muted-foreground">
        Vehicle released and payment collected. This order is now read-only.
      </p>
    </div>
  );
}

export const ORDER_STAGES = {
  "Pending Diagnosis": AssignDiagnosticianStage,
  "Awaiting Diagnosis": DiagnosisStage,
  "Pending Mechanics": AssignMechanicsStage,
  "In Progress": RepairInProgressStage,
  "Awaiting Parts": AwaitingPartsStage,
  "Ready to Invoice": GenerateInvoiceStage,
  "Awaiting Payment": CollectPaymentStage,
  "Ready for Release": ReleaseVehicleStage,
  Fulfilled: CompletedStage,
};