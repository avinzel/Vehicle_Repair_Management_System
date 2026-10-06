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

// roles.role_id -> label (matches the seeded roles table)
export const STAFF_ROLES = [
  { value: "1", label: "Admin" },
  { value: "2", label: "Service Advisor" },
  { value: "3", label: "Mechanic" },
];

// users.status is ENUM('ACTIVE','INACTIVE') — there is no "On Leave" for staff.
export const STAFF_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

function Field({ label, children, className = "" }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

// Create + edit in one modal (same pattern as MechanicFormDialog).
// `staff` is the normalized row or null for "add". Add mode also asks for
// a password because it maps to POST action=register.
//
// onSubmit receives the payload shaped for the API and must throw on
// failure so the message shows inside the modal.
export function StaffFormDialog({ open, onOpenChange, staff, onSubmit }) {
  const isEdit = !!staff;

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState("2");
  const [status, setStatus] = useState("ACTIVE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset whenever the modal opens (or switches between add / edit).
  useEffect(() => {
    if (!open) return;
    setError(null);
    setFirstName(staff?.firstName ?? "");
    setMiddleName(staff?.middleName ?? "");
    setLastName(staff?.lastName ?? "");
    setUsername(staff?.username ?? "");
    setPassword("");
    setEmail(staff?.email ?? "");
    setPhone(staff?.phone ?? "");
    setRoleId(staff?.roleId != null ? String(staff.roleId) : "2");
    setStatus(staff?.status ?? "ACTIVE");
  }, [open, staff]);

  const canSubmit =
    !submitting &&
    firstName.trim() &&
    lastName.trim() &&
    username.trim() &&
    email.trim() &&
    phone.trim() &&
    roleId &&
    (isEdit || password.trim());

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        username: username.trim(),
        first_name: firstName.trim(),
        middle_name: middleName.trim() || null,
        last_name: lastName.trim(),
        contact_no: phone.trim(),
        email: email.trim(),
        role_id: Number(roleId),
        status,
      };
      if (!isEdit) payload.password = password;
      await onSubmit(payload);
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this staff member's details, role, or status."
              : "Register a new staff account for the portal."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="First name">
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Juan"
                disabled={submitting}
                autoFocus
              />
            </Field>
            <Field label="Middle name">
              <Input
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Optional"
                disabled={submitting}
              />
            </Field>
            <Field label="Last name">
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dela Cruz"
                disabled={submitting}
              />
            </Field>
          </div>

          <div className={isEdit ? "" : "grid grid-cols-2 gap-3"}>
            <Field label="Username">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. juandc"
                autoComplete="off"
                disabled={submitting}
              />
            </Field>
            {!isEdit && (
              <Field label="Password">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Initial password"
                  autoComplete="new-password"
                  disabled={submitting}
                />
              </Field>
            )}
          </div>

          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. juan@repairms.ph"
              disabled={submitting}
            />
          </Field>

          <Field label="Phone">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 09171234567"
              maxLength={20}
              disabled={submitting}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <Select
                items={STAFF_ROLES}
                value={roleId}
                onValueChange={(v) => setRoleId(v ?? "2")}
                disabled={submitting}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select
                items={STAFF_STATUSES}
                value={status}
                onValueChange={(v) => setStatus(v ?? "ACTIVE")}
                disabled={submitting}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "Saving..." : isEdit ? "Save changes" : "Add member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}