// utils/normalizeOrder.js
//
// Every backend endpoint that returns order data (getActiveRepairOrders,
// getRepairOrderDetails, the dashboard SP, etc.) uses its own column
// aliases, and none of them match the camelCase names the frontend
// components read directly (OrderCard, RepairOrderDetail, InvoiceDetail,
// OrderStages). This is the single place that reconciles that gap — run
// every order object through this once, right where it's fetched, rather
// than adding backend-specific fallbacks inside shared components.
export function normalizeOrder(raw) {
  if (!raw) return raw;

  // List endpoint (getActiveRepairOrders) bundles vehicle/plate/type into
  // one display string: "Toyota Vios 2021 · ABC-1234 · CAR". The detail
  // endpoint (getRepairOrderDetails) returns them as separate keys
  // instead. Split the bundled string only as a fallback for whichever
  // of the three the separate keys don't already cover.
  const vehicleInfoParts =
    typeof raw.vehicle_info === "string" ? raw.vehicle_info.split(" · ") : null;

  // List endpoint's assigned_mechanics is a flat, comma-joined STRING
  // ("Vinzel Mandap" or "Unassigned") — a GROUP_CONCAT of names, no ids
  // or positions. The detail endpoint's is an ARRAY of full objects. Only
  // the array form carries role, so team entries built from the string
  // form are name-only; they get overwritten with the real
  // (name + role) version once a drawer's own detail fetch resolves and
  // merges over this row (see ActiveRepairOrder's mergeOrder).
  const mechanicsFromSummaryString =
    typeof raw.assigned_mechanics === "string"
      ? raw.assigned_mechanics === "Unassigned" || !raw.assigned_mechanics.trim()
        ? []
        : raw.assigned_mechanics.split(",").map((name) => ({ name: name.trim(), role: null }))
      : null;

  return {
    ...raw, // keep anything not explicitly mapped below, so new/unknown backend fields aren't silently dropped

    id: raw.order_id ?? raw.orderId ?? raw.id ?? null,
    rawId: raw.raw_order_id ?? raw.rawId ?? null,

    customer: raw.customer_name ?? raw.customer ?? null,
    vehicle: raw.vehicle_name ?? (vehicleInfoParts ? vehicleInfoParts[0] : null) ?? raw.vehicle ?? null,
    plateNumber: raw.plate_number ?? raw.plateNumber ?? (vehicleInfoParts ? vehicleInfoParts[1] : null) ?? null,
    vehicleType: raw.vehicle_type ?? raw.vehicleType ?? (vehicleInfoParts ? vehicleInfoParts[2] : null) ?? null,

    date: raw.formatted_date ?? raw.date ?? null,
    status: raw.status ?? null,
    priority: raw.priority ?? null,

    complaint: raw.complaint ?? null,
    diagnosticNotes: raw.diagnosis_notes ?? raw.diagnosticNotes ?? null,
    diagnosisDate: raw.formatted_diagnosis_date ?? null,

    // Card display total. invoice_amount (list endpoint) is legitimately
    // null for pre-invoice statuses — that's correct data, not a bug;
    // OrderCard already hides the amount line whenever this is null.
    amount: raw.grand_total ?? raw.invoice_amount ?? raw.amount ?? null,
    laborCharges: raw.total_labor_cost ?? raw.laborCharges ?? null,
    partsCharges: raw.total_parts_cost ?? raw.partsCharges ?? null,

    requiredServices: Array.isArray(raw.services)
      ? raw.services.map((s) => s.service_name)
      : raw.requiredServices ?? [],

    partsLogged: Array.isArray(raw.parts)
      ? raw.parts.map((p) => ({
        order_part_id: p.order_part_id,
        part_id: p.part_id,
        name: p.part_name,
        quantity_used: p.quantity_used,
        unit_price: p.unit_price,
        // TODO: confirm whether getRepairOrderDetails actually echoes
        // a per-row status (ISSUED/PENDING_PARTS) — this sample
        // response didn't include one.
        status: p.status ?? "ISSUED",
      }))
      : raw.partsLogged ?? [],

    // Detail endpoint: array of full {mechanic_id, mechanic_name,
    // position_name} objects -> {id, name, role}.
    // List endpoint: falls back to the name-only array parsed from the
    // GROUP_CONCAT string above.
    team: Array.isArray(raw.assigned_mechanics)
      ? raw.assigned_mechanics.map((m) => ({
        id: m.mechanic_id,
        name: m.mechanic_name,
        role: m.position_name,
      }))
      : mechanicsFromSummaryString ?? raw.team ?? [],

    //normalized parts
    part_id: raw.part_id ?? raw.partId ?? raw.id,
    part_name: raw.part_name ?? raw.partName ?? raw.name,
    unit: raw.unit ?? null,
    unit_price: Number(raw.unit_price ?? raw.unitPrice ?? 0),
    quantity_on_hand: Number(raw.quantity_on_hand ?? raw.quantityOnHand ?? 0),
    reorder_level: Number(raw.reorder_level ?? raw.reorderLevel ?? 0),

    //normalized logged parts
    order_part_id: raw.order_part_id ?? raw.orderPartId ?? raw.id,
    part_id: raw.part_id ?? raw.partId,
    part_name: raw.part_name ?? raw.partName ?? raw.name,
    quantity_used: Number(raw.quantity_used ?? raw.quantityUsed ?? 0),
    unit_price: Number(raw.unit_price ?? raw.unitPrice ?? 0),
    status: raw.status ?? "ISSUED",
    // NOT CONFIRMED: the original repair_order_parts schema I've seen has
    // no "who logged this" column at all — this may just come back empty
    // until/unless that's added on the backend. Falls back to "—" rather
    // than showing "by null".
    loggedBy: raw.logged_by ?? raw.loggedBy ?? raw.mechanic_name ?? null,
  };

  
}