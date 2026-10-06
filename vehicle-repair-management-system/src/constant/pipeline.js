// constants/pipeline.js
//
// Single source of truth for the repair-order pipeline: order, labels and
// colors. Shared by the admin dashboard and the Reports > Pipeline tab so
// the two never drift apart.
//
// Tailwind only generates classes it can see as complete literal strings,
// so every class below is written out in full (no `bg-${color}-600`).
//
// `hex` is for chart libraries (Recharts etc.) that need a raw color.

export const PIPELINE = [
  { status: "PENDING_DIAGNOSIS",  label: "Pending Diagnosis",  short: "Pending Dx",   hex: "#ca8a04", bar: "bg-yellow-600", dot: "bg-yellow-600", pill: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { status: "AWAITING_DIAGNOSIS", label: "Awaiting Diagnosis", short: "Awaiting Dx",  hex: "#d97706", bar: "bg-amber-600",  dot: "bg-amber-600",  pill: "bg-amber-50 text-amber-700 border-amber-200" },
  { status: "PENDING_MECHANICS",  label: "Pending Mechanics",  short: "Pending Mech", hex: "#0284c7", bar: "bg-sky-600",    dot: "bg-sky-600",    pill: "bg-sky-50 text-sky-700 border-sky-200" },
  { status: "IN_PROGRESS",        label: "In Progress",        short: "In Progress",  hex: "#2563eb", bar: "bg-blue-600",   dot: "bg-blue-600",   pill: "bg-blue-50 text-blue-700 border-blue-200" },
  { status: "READY_TO_INVOICE",   label: "Ready to Invoice",   short: "To Invoice",   hex: "#7c3aed", bar: "bg-violet-600", dot: "bg-violet-600", pill: "bg-violet-50 text-violet-700 border-violet-200" },
  { status: "AWAITING_PAYMENT",   label: "Awaiting Payment",   short: "Payment",      hex: "#c2410c", bar: "bg-orange-700", dot: "bg-orange-700", pill: "bg-orange-50 text-orange-700 border-orange-200" },
  { status: "READY_FOR_RELEASE",  label: "Ready for Release",  short: "Release",      hex: "#16a34a", bar: "bg-green-600",  dot: "bg-green-600",  pill: "bg-green-50 text-green-700 border-green-200" },
  { status: "FULFILLED",          label: "Fulfilled",          short: "Fulfilled",    hex: "#475569", bar: "bg-slate-600",  dot: "bg-slate-600",  pill: "bg-slate-100 text-slate-700 border-slate-200" },
];

// Statuses that exist in the DB enum but are intentionally not stages of
// the happy-path pipeline. The Pipeline tab shows them separately (or not
// at all) instead of as a bar.
//   AWAITING_PARTS - a hold state that can occur during IN_PROGRESS
//   CANCELLED      - terminal, not part of the flow
export const OFF_PIPELINE = [
  { status: "AWAITING_PARTS", label: "Awaiting Parts", short: "Parts Hold", hex: "#dc2626", bar: "bg-red-600",  dot: "bg-red-600",  pill: "bg-red-50 text-red-700 border-red-200" },
  { status: "CANCELLED",      label: "Cancelled",      short: "Cancelled",  hex: "#9ca3af", bar: "bg-gray-400", dot: "bg-gray-400", pill: "bg-gray-100 text-gray-600 border-gray-200" },
];

const BY_STATUS = Object.fromEntries([...PIPELINE, ...OFF_PIPELINE].map((s) => [s.status, s]));

export function getStage(status) {
  return BY_STATUS[status] ?? null;
}

// Statuses that count as "active" (still in the pipeline, not closed).
// Keep consistent with the active-orders logic on the backend.
export const ACTIVE_STATUSES = [
  "PENDING_DIAGNOSIS",
  "AWAITING_DIAGNOSIS",
  "PENDING_MECHANICS",
  "IN_PROGRESS",
  "AWAITING_PARTS",
  "READY_TO_INVOICE",
  "AWAITING_PAYMENT",
  "READY_FOR_RELEASE",
];