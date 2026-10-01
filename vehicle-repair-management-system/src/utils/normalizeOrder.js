// utils/normalizeOrder.js
//
// One normalizer per backend source. Each reads the EXACT columns its
// stored procedure returns (see vehicle_repair_schema.sql) — no key
// guessing. If an SP changes, only its normalizer changes.

// ---------- shared helpers ----------

// Accepts 5 or "RO-5" (SPs disagree on which they return).
function parseRawId(value) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  const n = parseInt(String(value).replace(/\D/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

const formatRO = (rawId) => (rawId == null ? null : `RO-${rawId}`);

const num = (v) => (v == null ? null : Number(v));

// MySQL DATETIME "2026-08-25 11:40:00" -> "Aug 25, 2026"
function formatDate(dt) {
  if (!dt) return null;
  const d = new Date(String(dt).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

// Some SPs build JSON with CONCAT; the PHP model may or may not have decoded it.
function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// ---------- Active Repair Orders: list row ----------
// sp_get_active_repair_orders
// order_id ("RO-5"), raw_order_id, customer_name, vehicle_info
// ("Toyota Vios 2021 · ABC-1234 · CAR"), status, priority, formatted_date,
// assigned_mechanics (comma string of names), invoice_amount
export function normalizeActiveOrderRow(raw) {
  // TODO: add plate_number + vehicle_type as real columns in the SP and
  // delete this split. vehicle_info is display text, not a data contract.
  const [vehicle, plateNumber, vehicleType] = String(raw.vehicle_info ?? "").split(" · ");

  return {
    id: raw.order_id,
    rawId: num(raw.raw_order_id),
    customer: raw.customer_name,
    vehicle: vehicle ?? null,
    plateNumber: plateNumber ?? null,
    plate: plateNumber ?? null, // alias: some components read `plate`
    vehicleType: vehicleType ?? null,
    status: raw.status,
    priority: raw.priority,
    date: raw.formatted_date,
    assignedMechanicsLabel: raw.assigned_mechanics, // "Unassigned" or "A B, C D"
    amount: num(raw.invoice_amount),
  };
}

// ---------- Active Repair Orders: detail ----------
// sp_get_repair_order_details (via RepairOrder::getRepairOrderDetails,
// which already json_decodes the three array columns)
export function normalizeOrderDetail(raw) {
  const mechanics = asArray(raw.assigned_mechanics);
  const services = asArray(raw.services);
  const parts = asArray(raw.parts);

  return {
    id: raw.order_id,
    rawId: num(raw.raw_order_id),
    date: raw.formatted_date,
    status: raw.status,
    complaint: raw.complaint,
    diagnosticNotes: raw.diagnosis_notes,
    diagnosisDate: raw.formatted_diagnosis_date,
    customer: raw.customer_name,
    vehicle: raw.vehicle_name,
    plateNumber: raw.plate_number,
    plate: raw.plate_number, // alias: some components read `plate`
    vehicleType: raw.vehicle_type,

    team: mechanics.map((m) => ({
      id: m.mechanic_id,
      assignmentId: m.assignment_id,
      name: m.mechanic_name,
      role: m.position_name,
      dateAssigned: m.date_assigned,
    })),

    requiredServices: services.map((s) => s.service_name),
    requiredServiceIds: services.map((s) => s.service_catalog_id),
    services: services.map((s) => ({
      id: s.service_catalog_id,
      name: s.service_name,
      laborCost: num(s.labor_cost),
    })),

    partsLogged: parts.map((p) => ({
      id: p.order_part_id,
      partId: p.part_id,
      name: p.part_name,
      qty: p.quantity_used,
      cost: num(p.unit_price),
      subtotal: num(p.parts_subtotal),
      // loggedBy: not returned by the SP
    })),

    laborCharges: num(raw.total_labor_cost),
    partsCharges: num(raw.total_parts_cost),
    amount: num(raw.grand_total),
  };
}

// ---------- Billing & Invoicing: list row ----------
// sp_get_billing_and_invoicing
// order_id ("RO-5"), raw_order_id, customer_name, vehicle_summary
// ("Toyota Vios 2021 · Aug 27, 2026"), status, formatted_total_amount, total_amount
export function normalizeBillingRow(raw) {
  return {
    id: raw.order_id,
    rawId: num(raw.raw_order_id),
    customer: raw.customer_name,
    vehicle: raw.vehicle_summary, // already includes the date
    status: raw.status,
    amount: num(raw.total_amount),
    amountLabel: raw.formatted_total_amount,
  };
}

// ---------- Billing & Invoicing: drawer detail ----------
// sp_get_invoice_details via Invoice::getInvoiceDetails.
// NOTE: order_id here is NUMERIC and status is order_status.
export function normalizeInvoiceDetail(raw) {
  const rawId = parseRawId(raw.order_id);
  return {
    id: raw.order_number ?? formatRO(rawId),
    rawId,
    status: raw.order_status,
    customer: raw.customer_name,
    vehicle: raw.vehicle_info,
    laborCharges: num(raw.labor_charges),
    partsCharges: num(raw.parts_charges),
    discount: num(raw.discount),
    taxAmount: num(raw.tax_amount),
    amount: num(raw.total_due),
    invoiceStatus: raw.invoice_status,
    paymentMethod: raw.payment_method,
    paymentReference: raw.payment_reference,
    paymentDate: raw.payment_date,
    team: (raw.mechanics ?? []).map((m) => ({
      id: m.assignment_id,
      name: m.mechanic_name,
      role: m.position, // NOT position_name here
    })),
  };
}

// ---------- Mechanic: assigned work orders ----------
// sp_get_mechanic_work_orders
// NOTE: order_id NUMERIC, status is order_status, id label is formatted_ro_number.
export function normalizeMechanicWorkOrder(raw) {
  const rawId = parseRawId(raw.order_id);
  return {
    id: raw.formatted_ro_number ?? formatRO(rawId),
    rawId,
    status: raw.order_status,
    priority: raw.priority,
    complaint: raw.complaint,
    diagnosticNotes: raw.diagnosis_notes,
    date: formatDate(raw.date_received),
    customer: raw.customer_name,
    vehicle: [raw.manufacturer, raw.model, raw.year_model].filter(Boolean).join(" "),
    plateNumber: raw.plate_number,
    plate: raw.plate_number, // alias: some components read `plate`
    vehicleSummary: raw.vehicle_summary,
    assignedPosition: raw.assigned_position,
    partsLoggedCount: num(raw.parts_logged_count),
    totalMechanicsCount: num(raw.total_mechanics_count),
    // The SP returns counts only, so the actual parts array is not
    // available here. Consumers must use partsLoggedCount, or fetch
    // category=parts-by-order when the drawer opens.
    partsLogged: [],
  };
}

// ---------- Parts: inventory row ----------
// sp_get_parts_inventory
export function normalizePart(raw) {
  return {
    part_id: num(raw.part_id),
    part_code: raw.part_code,
    part_name: raw.part_name,
    category: raw.category,
    unit: raw.unit,
    unit_price: num(raw.unit_price),
    quantity_on_hand: num(raw.quantity_on_hand),
    reorder_level: num(raw.reorder_level),
    batch_number: raw.batch_number,
    date_added: raw.date_added,
    status: raw.status,
  };
}

// ---------- Parts: logged on an order ----------
// sp_get_parts_by_repair_order
// NOTE: part_status (not status), unit_price_at_use (not unit_price).
export function normalizeLoggedPart(raw) {
  return {
    order_part_id: num(raw.order_part_id),
    order_id: num(raw.order_id),
    part_id: num(raw.part_id),
    part_code: raw.part_code,
    part_name: raw.part_name,
    category: raw.category,
    unit: raw.unit,
    batch_number: raw.batch_number,
    quantity_used: num(raw.quantity_used),
    unit_price: num(raw.unit_price_at_use), // price frozen at time of use
    current_unit_price: num(raw.current_unit_price),
    subtotal: num(raw.subtotal),
    status: raw.part_status, // ISSUED | PENDING_PARTS (CANCELLED filtered by SP)
    inventory_status: raw.inventory_status,
    // loggedBy: not returned by the SP
  };
}