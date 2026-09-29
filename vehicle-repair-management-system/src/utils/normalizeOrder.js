// utils/normalizeOrder.js
//
// Every backend endpoint that returns order data (getActiveRepairOrders,
// getRepairOrderDetails, the dashboard SP, sp_get_mechanic_work_orders,
// etc.) uses its own column aliases, and none of them match the camelCase
// names the frontend components read directly (OrderCard,
// RepairOrderDetail, InvoiceDetail, OrderStages). This is the single place
// that reconciles that gap — run every order object through this once,
// right where it's fetched, rather than adding backend-specific fallbacks
// inside shared components.
//
// NOTE: this function also normalizes part rows (getParts / logged parts),
// which is why the part_* fields exist below. Each key appears exactly
// once in the returned object — in a JS object literal a duplicate key
// silently overwrites the earlier one, which is how `status` used to end
// up as "ISSUED" on every order.
export function normalizeOrder(raw) {
  if (!raw) return raw;

  // A row is a part row (as opposed to an order row) if it carries any of
  // the part identifiers. Order rows never do, so this lets `status`
  // default to "ISSUED" for parts only.
  const isPartRow =
    raw.order_part_id !== undefined ||
    raw.orderPartId !== undefined ||
    raw.part_id !== undefined ||
    raw.partId !== undefined ||
    raw.part_name !== undefined ||
    raw.partName !== undefined;

  // List endpoint (getActiveRepairOrders) bundles vehicle/plate/type into
  // one display string: "Toyota Vios 2021 · ABC-1234 · CAR". The detail
  // endpoint (getRepairOrderDetails) returns them as separate keys
  // instead. Split the bundled string only as a fallback for whichever
  // of the three the separate keys don't already cover.
  const vehicleInfoParts =
    typeof raw.vehicle_info === "string" ? raw.vehicle_info.split(" · ") : null;

  // sp_get_mechanic_work_orders returns manufacturer / model / year_model
  // as separate columns instead of a single vehicle name.
  const vehicleFromParts = raw.manufacturer
    ? `${raw.manufacturer} ${raw.model ?? ""}${raw.year_model ? " " + raw.year_model : ""}`.trim()
    : null;

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

  const plateNumber =
    raw.plate_number ?? raw.plateNumber ?? (vehicleInfoParts ? vehicleInfoParts[1] : null) ?? null;

  return {
    ...raw, // keep anything not explicitly mapped below, so new/unknown backend fields aren't silently dropped

    // formatted_ro_number ("RO-1050") comes from the mechanic work-order
    // SP; it has no raw_order_id, so when it's present the numeric
    // order_id is the raw id.
    id: raw.formatted_ro_number ?? raw.order_id ?? raw.orderId ?? raw.id ?? null,
    rawId:
      raw.raw_order_id ??
      raw.rawId ??
      (raw.formatted_ro_number ? raw.order_id : null) ??
      null,

    customer: raw.customer_name ?? raw.customer ?? null,
    vehicle:
      raw.vehicle_name ??
      (vehicleInfoParts ? vehicleInfoParts[0] : null) ??
      vehicleFromParts ??
      raw.vehicle ??
      null,
    plateNumber,
    plate: plateNumber, // alias — some components read `plate`
    vehicleType: raw.vehicle_type ?? raw.vehicleType ?? (vehicleInfoParts ? vehicleInfoParts[2] : null) ?? null,

    date: raw.formatted_date ?? raw.date ?? raw.date_received ?? null,

    // order_status: sp_get_mechanic_work_orders. status: every other
    // order endpoint. Part rows fall back to "ISSUED"; order rows stay
    // null rather than being mislabelled.
    status: raw.order_status ?? raw.status ?? (isPartRow ? "ISSUED" : null),
    priority: raw.priority ?? null,

    complaint: raw.complaint ?? null,
    diagnosticNotes: raw.diagnosis_notes ?? raw.diagnosticNotes ?? null,
    diagnosisDate: raw.formatted_diagnosis_date ?? null,

    // The mechanic's own position on this order (sp_get_mechanic_work_orders
    // only returns the viewer's position, not the whole crew).
    assignedPosition: raw.assigned_position ?? null,

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

    // ---- part-row fields (getParts / logged parts) ----
    // Each key once. Where the old file defined a key twice, the LAST
    // definition was the one in effect, so that's the behaviour kept here.
    part_id: raw.part_id ?? raw.partId,
    part_name: raw.part_name ?? raw.partName ?? raw.name,
    unit: raw.unit ?? null,
    unit_price: Number(raw.unit_price ?? raw.unitPrice ?? 0),
    quantity_on_hand: Number(raw.quantity_on_hand ?? raw.quantityOnHand ?? 0),
    reorder_level: Number(raw.reorder_level ?? raw.reorderLevel ?? 0),

    order_part_id: raw.order_part_id ?? raw.orderPartId ?? raw.id,
    quantity_used: Number(raw.quantity_used ?? raw.quantityUsed ?? 0),
    // NOT CONFIRMED: the original repair_order_parts schema I've seen has
    // no "who logged this" column at all — this may just come back empty
    // until/unless that's added on the backend. Falls back to "—" rather
    // than showing "by null".
    loggedBy: raw.logged_by ?? raw.loggedBy ?? raw.mechanic_name ?? null,
  };
}