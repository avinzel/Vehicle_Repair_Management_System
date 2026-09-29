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

const API = "http://localhost:8000/api.php";

export const STATUS = {
  PENDING_DIAGNOSIS: "PENDING_DIAGNOSIS",
  AWAITING_DIAGNOSIS: "AWAITING_DIAGNOSIS",
  PENDING_MECHANICS: "PENDING_MECHANICS",
  IN_PROGRESS: "IN_PROGRESS",
  AWAITING_PARTS: "AWAITING_PARTS",
  READY_TO_INVOICE: "READY_TO_INVOICE",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  READY_FOR_RELEASE: "READY_FOR_RELEASE",
  FULFILLED: "FULFILLED",
};

function formatCurrency(amount) {
  if (amount == null) return null;
  return `₱${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

// --- Shape helpers -----------------------------------------------------
// sp_get_repair_order_details builds `assigned_mechanics` and `services` with
// CONCAT, so they can arrive as JSON strings. The list SP
// (sp_get_active_repair_orders) only returns a comma-separated name string
// for assigned_mechanics, which is NOT parseable — those fall through to [].
// These helpers accept either the already-normalized fields (order.team,
// order.requiredServices) or the raw detail columns.
// TODO: tighten once normalizeOrder's real output for these is confirmed.
function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getTeam(order) {
  if (Array.isArray(order.team) && order.team.length > 0) return order.team;
  return parseJsonArray(order.assigned_mechanics ?? order.assignedMechanics).map((m) => ({
    id: m.mechanic_id,
    name: m.mechanic_name,
    role: m.position_name,
  }));
}

function getServiceNames(order) {
  if (Array.isArray(order.requiredServices) && order.requiredServices.length > 0) {
    return order.requiredServices;
  }
  return parseJsonArray(order.services).map((s) => s.service_name);
}

function getDiagnostician(order) {
  const team = getTeam(order);
  return team.find((m) => m.role === "Diagnostician") ?? team[0];
}

// --- Pending Diagnosis: assign diagnostician ---
// GET action=mechanics&available=true&order_id=X, then
// POST action=repair-orders&post-method=assign-diagnostician.
// No position filter: position lives on repair_order_mechanics per order,
// so any available mechanic can be this order's Diagnostician.
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
      `${API}?action=mechanics&available=true&order_id=${encodeURIComponent(orderRawId)}`,
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

  const mechanicItems = mechanics.map((m) => ({
    value: String(m.mechanic_id),
    label: `${m.full_name}${m.specialization ? ` · ${m.specialization}` : ""}`,
  }));

  async function handleAssign() {
    setAssigning(true);
    setError(null);
    try {
      const response = await fetch(`${API}?action=repair-orders&post-method=assign-diagnostician`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: Number(orderRawId),
          mechanic_id: Number(selectedMechanicId),
        }),
      });
      const json = await response.json();

      if (json.status === "success") {
        // Parent refetches everything; the updates object is ignored.
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

// --- Awaiting Diagnosis: no advisor action; advances when the mechanic
// files notes from Diagnostic Log. ---
function DiagnosisStage({ order }) {
  const diagnostician = getDiagnostician(order);

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

// --- Pending Mechanics: the ONLY stage where the repair team is built. ---
// Available mechanics: GET action=mechanics&available=true&order_id=X
// (already excludes anyone on this order, including the diagnostician).
// Positions: GET action=mechanic-position.
// Submit: one POST assign-mechanic per row, SEQUENTIALLY — sp_assign_mechanic
// flips the order PENDING_MECHANICS -> IN_PROGRESS on the first success, and
// later rows are valid only because IN_PROGRESS is also accepted.
function AssignMechanicsStage({ order, onUpdateOrder }) {
  const diagnostician = getDiagnostician(order);
  const orderRawId = order.rawId ?? order.id;

  const [mechanics, setMechanics] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Each row: { rowId, mechanicId, positionId } (ids kept as strings)
  const [rows, setRows] = useState([{ rowId: crypto.randomUUID(), mechanicId: "", positionId: "" }]);
  const [openComboboxRowId, setOpenComboboxRowId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    Promise.all([
      fetch(`${API}?action=mechanics&available=true&order_id=${encodeURIComponent(orderRawId)}`, {
        credentials: "include",
      }).then((r) => r.json()),
      fetch(`${API}?action=mechanic-position`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([mechJson, posJson]) => {
        if (cancelled) return;
        if (Array.isArray(mechJson.data)) {
          setMechanics(mechJson.data);
        } else {
          setLoadError(mechJson.error ?? "Failed to load available mechanics");
        }
        // TODO: MechanicPosition::getAllMechanicPositions isn't in the
        // uploaded files, so its envelope is unconfirmed — accept the
        // likely ones. Rows expected: { position_id, position_name }.
        const posRows = Array.isArray(posJson)
          ? posJson
          : posJson.data ?? posJson.positions ?? posJson.mechanic_positions ?? [];
        // Diagnostician is assigned one stage earlier and is locked in.
        setPositions(posRows.filter((p) => p.position_name !== "Diagnostician"));
      })
      .catch(() => {
        if (!cancelled) setLoadError("Failed to load mechanics or positions");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderRawId]);

  const positionItems = positions.map((p) => ({
    value: String(p.position_id),
    label: p.position_name,
  }));

  const pickedIds = new Set(rows.map((r) => r.mechanicId).filter(Boolean));

  function addRow() {
    setRows((prev) => [...prev, { rowId: crypto.randomUUID(), mechanicId: "", positionId: "" }]);
  }

  function removeRow(rowId) {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  function updateRow(rowId, changes) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...changes } : r)));
  }

  const isComplete = rows.length > 0 && rows.every((r) => r.mechanicId && r.positionId);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    for (const row of rows) {
      const mechanic = mechanics.find((m) => String(m.mechanic_id) === row.mechanicId);
      try {
        const response = await fetch(`${API}?action=repair-orders&post-method=assign-mechanic`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: Number(orderRawId),
            mechanic_id: Number(row.mechanicId),
            position_id: Number(row.positionId),
          }),
        });
        const json = await response.json().catch(() => ({}));

        if (!response.ok || json.status !== "success") {
          throw new Error(json.error ?? `HTTP ${response.status}`);
        }
        // Drop rows that already succeeded so a retry doesn't re-send them.
        setRows((prev) => prev.filter((r) => r.rowId !== row.rowId));
      } catch (err) {
        setSubmitError(`Could not assign ${mechanic?.full_name ?? "mechanic"}: ${err.message}`);
        setSubmitting(false);
        // Earlier rows may have succeeded (order can already be In Progress).
        onUpdateOrder(order.id, {});
        return;
      }
    }

    setSubmitting(false);
    onUpdateOrder(order.id, {});
  }

  const serviceNames = getServiceNames(order);

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
            {serviceNames.map((service) => (
              <Badge key={service} variant="secondary">
                {service}
              </Badge>
            ))}
            {serviceNames.length === 0 && (
              <p className="text-sm text-muted-foreground">None recorded.</p>
            )}
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

        {loadError && <p className="text-sm text-destructive">{loadError}</p>}

        {rows.map((row) => {
          const mechanic = mechanics.find((m) => String(m.mechanic_id) === row.mechanicId);
          const options = mechanics.filter(
            (m) => !pickedIds.has(String(m.mechanic_id)) || String(m.mechanic_id) === row.mechanicId
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
                    disabled={loading || submitting}
                    className="flex-1 justify-between font-normal bg-background"
                  >
                    {mechanic ? mechanic.full_name : loading ? "Loading..." : "Choose a mechanic..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search mechanics..." />
                    <CommandList>
                      <CommandEmpty>No mechanic found.</CommandEmpty>
                      <CommandGroup>
                        {options.map((m) => (
                          <CommandItem
                            key={m.mechanic_id}
                            value={m.full_name}
                            onSelect={() => {
                              updateRow(row.rowId, { mechanicId: String(m.mechanic_id) });
                              setOpenComboboxRowId(null);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                row.mechanicId === String(m.mechanic_id) ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <span className="flex-1">{m.full_name}</span>
                            {m.specialization && (
                              <span className="text-xs text-muted-foreground">{m.specialization}</span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Select
                items={positionItems}
                value={row.positionId || null}
                onValueChange={(value) => updateRow(row.rowId, { positionId: value ?? "" })}
                disabled={loading || submitting}
              >
                <SelectTrigger className="w-44 bg-background">
                  <SelectValue placeholder="Position..." />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (
                    <SelectItem key={p.position_id} value={String(p.position_id)}>
                      {p.position_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {rows.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove mechanic"
                  disabled={submitting}
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
          disabled={submitting || rows.length >= mechanics.length}
          className="w-full text-sm text-muted-foreground border border-dashed border-border rounded-lg py-2 hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-50"
        >
          + Add Another Mechanic
        </button>

        {submitError && (
          <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            {submitError}
          </p>
        )}

        <Button type="button" className="w-full" disabled={!isComplete || submitting || loading} onClick={handleSubmit}>
          {submitting ? "Assigning..." : "Assign Mechanics & Start Repair"}
        </Button>
      </div>
    </div>
  );
}

// --- In Progress: read-only. Marking the job complete belongs to the Lead
// Mechanic's own interface, and the roster is locked once work starts. ---
function RepairInProgressStage({ order }) {
  const team = getTeam(order);
  const serviceNames = getServiceNames(order);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">
          Assigned Mechanics
        </h3>
        {team.map((member) => (
          <MechanicChip key={member.id ?? member.name} name={member.name} role={member.role} />
        ))}
        {team.length === 0 && (
          <p className="text-sm text-muted-foreground">No mechanics assigned.</p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">Diagnosis</h3>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Required Services</p>
          <div className="flex flex-wrap gap-1.5">
            {serviceNames.map((service) => (
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

// --- Awaiting Parts: shows which logged parts are actually blocking.
// GET category=parts-by-order&order_id=X returns non-cancelled rows with
// part_name, quantity_used and part_status (ISSUED | PENDING_PARTS). ---
function AwaitingPartsStage({ order }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const orderRawId = order.rawId ?? order.id;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`${API}?action=repair-orders&category=parts-by-order&order_id=${encodeURIComponent(orderRawId)}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const rows = Array.isArray(json.data) ? json.data : [];
        setPending(rows.filter((r) => r.part_status === "PENDING_PARTS"));
      })
      .catch((err) => console.error("Failed to fetch pending parts:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderRawId]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">Awaiting Parts</h3>
      <p className="text-sm text-muted-foreground">
        This order is on hold — a required part is out of stock. It resumes automatically once the
        part is restocked.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading pending parts...</p>
      ) : (
        pending.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Waiting on</p>
            {pending.map((part) => (
              <div
                key={part.order_part_id}
                className="flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2 text-sm"
              >
                <span>{part.part_name}</span>
                <span>Qty {part.quantity_used}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// --- Invoicing-adjacent stages: financial content lives ONLY on the
// Billing & Invoicing page. These stages just deep-link to it. ---
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
      description="Invoice generated. Collect payment to close out the order."
    />
  );
}

// sp_process_invoice_payment moves AWAITING_PAYMENT straight to FULFILLED,
// so READY_FOR_RELEASE is never reached by the current backend. Kept only
// so a stray/legacy row doesn't fall into the "Unknown status" fallback.
function ReleaseVehicleStage({ order }) {
  return (
    <InvoicingStub
      order={order}
      title="Ready for Release"
      description="Payment received. Review the invoice record."
    />
  );
}

function CompletedStage() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground tracking-wide">Order Complete</h3>
      <p className="text-sm text-muted-foreground">
        Payment collected and order fulfilled. This order is now read-only.
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