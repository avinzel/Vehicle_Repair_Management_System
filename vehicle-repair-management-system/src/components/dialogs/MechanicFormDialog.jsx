"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API = "http://localhost:8000/api.php";

const MECHANIC_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

// onSubmit receives the payload shaped for the API and must throw on
// failure so the message shows inside the modal.
export function MechanicFormDialog({ open, onOpenChange, mechanic, onSubmit }) {
  const [specialization, setSpecialization] = useState(mechanic?.specialization ?? "");
  const [dateHired, setDateHired] = useState(
    mechanic?.dateHired ? String(mechanic.dateHired).slice(0, 10) : ""
  );
  const [status, setStatus] = useState(
    mechanic?.deactivateOnOpen ? "INACTIVE" : mechanic?.status ?? "ACTIVE"
  );
  const [handoffAssignments, setHandoffAssignments] = useState([]);
  const [handoffCandidates, setHandoffCandidates] = useState([]);
  const [handoffs, setHandoffs] = useState({});
  const [loadingAssignments, setLoadingAssignments] = useState(
    Boolean(mechanic && (mechanic.deactivateOnOpen || mechanic.status === "INACTIVE"))
  );
  const [handoffError, setHandoffError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !mechanic || status !== "INACTIVE") return;

    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setLoadingAssignments(true);
        setHandoffError(null);
        setHandoffs({});
        return fetch(`${API}?action=mechanics&handoff-preview=1&mechanic_id=${encodeURIComponent(mechanic.id)}`, {
          credentials: "include",
        });
      })
      .then(async (response) => {
        if (!response) return null;
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error ?? `Request failed (HTTP ${response.status})`);
        return json;
      })
      .then((json) => {
        if (cancelled || !json) return;
        const assignments = json.data ?? [];
        setHandoffCandidates(json.candidates ?? []);
        setHandoffAssignments(assignments);
        setHandoffs(Object.fromEntries(assignments.map((item) => [item.assignment_id, ""])));
      })
      .catch((err) => {
        if (!cancelled) setHandoffError(err.message || "Failed to load open assignments.");
      })
      .finally(() => {
        if (!cancelled) setLoadingAssignments(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, mechanic, status]);

  const needsHandoff = status === "INACTIVE";
  const allHandoffsSelected = handoffAssignments.every(
    (assignment) => Boolean(handoffs[assignment.assignment_id])
  );
  const canSubmit = !submitting
    && specialization.trim()
    && dateHired
    && (!needsHandoff || (!loadingAssignments && !handoffError && allHandoffsSelected));

  function chooseReplacement(assignment, replacementId) {
    setHandoffs((current) => {
      const next = { ...current, [assignment.assignment_id]: replacementId };
      for (const other of handoffAssignments) {
        if (
          other.order_id === assignment.order_id
          && other.assignment_id !== assignment.assignment_id
          && next[other.assignment_id] === replacementId
        ) {
          next[other.assignment_id] = "";
        }
      }
      return next;
    });
  }

  function handleStatusChange(nextStatus) {
    if (nextStatus === "INACTIVE") setLoadingAssignments(true);
    setStatus(nextStatus ?? "ACTIVE");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        specialization: specialization.trim(),
        date_hired: dateHired,
        status,
        handoffs: needsHandoff
          ? handoffAssignments.map((assignment) => ({
              assignment_id: Number(assignment.assignment_id),
              replacement_mechanic_id: Number(handoffs[assignment.assignment_id]),
            }))
          : [],
      });
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{status === "INACTIVE" ? "Deactivate Mechanic" : "Edit Mechanic"}</DialogTitle>
          <DialogDescription>
            {status === "INACTIVE"
              ? "Open repair-order assignments must be handed to active mechanics before this account is deactivated."
              : "Update this mechanic's specialization, hire date, or status."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
            <Field label="Staff account">
              <Input value={mechanic?.name ?? ""} disabled />
            </Field>

            <Field label="Specialization">
              <Input
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Engine Diagnostics"
                disabled={submitting}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Date hired">
                <Input
                  type="date"
                  value={dateHired}
                  onChange={(e) => setDateHired(e.target.value)}
                  disabled={submitting}
                />
              </Field>
              <Field label="Status">
                <Select
                  items={MECHANIC_STATUSES}
                  value={status}
                  onValueChange={handleStatusChange}
                  disabled={submitting}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MECHANIC_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {needsHandoff && (
              <section className="space-y-3 rounded-lg border p-3">
                <div>
                  <h3 className="text-sm font-semibold">Open repair orders</h3>
                  <p className="text-xs text-muted-foreground">
                    Choose an active replacement for each assignment. Lead Mechanic assignments must be replaced by an active mechanic.
                  </p>
                  {!loadingAssignments && !handoffError && handoffAssignments.length > 0 && (
                    <p className="mt-1 text-xs font-medium text-foreground">
                      {handoffAssignments.filter((assignment) => handoffs[assignment.assignment_id]).length}
                      {" of "}
                      {handoffAssignments.length} assignments handed off
                    </p>
                  )}
                </div>

                {loadingAssignments && <p className="text-sm text-muted-foreground">Loading open assignments...</p>}
                {handoffError && (
                  <p role="alert" className="text-sm text-destructive">{handoffError}</p>
                )}
                {!loadingAssignments && !handoffError && handoffAssignments.length === 0 && (
                  <p className="text-sm text-muted-foreground">No open repair-order assignments need handoff.</p>
                )}
                {!loadingAssignments && !handoffError && handoffAssignments.map((assignment) => {
                  const assignedIds = new Set((assignment.assigned_mechanic_ids ?? []).map(Number));
                  const availableMechanics = handoffCandidates.filter((candidate) => {
                    if (assignedIds.has(Number(candidate.id))) return false;
                    return !handoffAssignments.some((other) =>
                      other.order_id === assignment.order_id
                      && other.assignment_id !== assignment.assignment_id
                      && Number(handoffs[other.assignment_id]) === Number(candidate.id)
                    );
                  });
                  const currentChoice = handoffs[assignment.assignment_id] ?? "";
                  const selectedMechanic = handoffCandidates.find((candidate) => Number(candidate.id) === Number(currentChoice));
                  const options = selectedMechanic && !availableMechanics.some((candidate) => candidate.id === selectedMechanic.id)
                    ? [...availableMechanics, selectedMechanic]
                    : availableMechanics;

                  return (
                    <div key={assignment.assignment_id} className="space-y-2 border-t pt-3">
                      <div className="text-sm">
                        <p className="font-medium">RO-{assignment.order_id} · {assignment.position_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.order_status.replaceAll("_", " ")}
                          {assignment.complaint ? ` · ${assignment.complaint}` : ""}
                        </p>
                      </div>
                      {options.length === 0 ? (
                        <p role="alert" className="text-sm text-destructive">
                          No eligible active mechanic is available for this assignment.
                        </p>
                      ) : (
                        <Select
                          items={options.map((candidate) => ({
                            value: String(candidate.id),
                            label: candidate.name,
                          }))}
                          value={currentChoice}
                          onValueChange={(value) => chooseReplacement(assignment, value ?? "")}
                          disabled={submitting || loadingAssignments}
                        >
                          <SelectTrigger className="w-full bg-background">
                            <SelectValue placeholder="Select an active replacement" />
                          </SelectTrigger>
                          <SelectContent>
                            {options.map((candidate) => (
                              <SelectItem key={candidate.id} value={String(candidate.id)}>
                                {candidate.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })}
              </section>
            )}

            {error && (
              <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "Saving..." : status === "INACTIVE" ? "Deactivate mechanic" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}