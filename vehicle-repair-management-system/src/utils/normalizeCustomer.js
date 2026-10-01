// utils/normalizeCustomer.js
//
// List rows come from sp_get_customer_directory (GET action=customers).
// Detail comes from sp_get_customer_details (GET action=customers&customer_id=X),
// which has THREE result sets: customer, vehicles, repair orders. See
// customer-details-backend.md for the SP + controller that produce this.

export function formatCustomerId(rawId) {
  return `C-${String(rawId).padStart(3, "0")}`;
}

// sp_get_customer_directory row -> table row
export function normalizeCustomerRow(raw) {
  return {
    rawId: raw.customer_id,
    id: raw.formatted_customer_id ?? formatCustomerId(raw.customer_id),
    name: raw.full_name ?? "",
    phone: raw.contact_no ?? null,
    email: raw.email ?? null,
    vehicleCount: Number(raw.vehicle_count ?? 0),
    lastVisit: raw.last_visit ?? null, // null when the customer has no orders yet
  };
}

// Accepts { customer, vehicles, orders } (what the controller sends) or a
// bare array of the three result sets, in case the model passes them through.
export function normalizeCustomerDetails(data) {
  let main = null;
  let vehicles = [];
  let orders = [];

  if (Array.isArray(data) && Array.isArray(data[0])) {
    main = data[0][0] ?? null;
    vehicles = Array.isArray(data[1]) ? data[1] : [];
    orders = Array.isArray(data[2]) ? data[2] : [];
  } else if (data && typeof data === "object") {
    main = data.customer ?? null;
    vehicles = data.vehicles ?? [];
    orders = data.orders ?? [];
  }

  if (!main) return null;

  return {
    rawId: main.customer_id,
    firstName: main.first_name ?? "",
    middleName: main.middle_name ?? "",
    lastName: main.last_name ?? "",
    phone: main.contact_no ?? null,
    email: main.email ?? null,
    address: main.address ?? null,
    vehicles: vehicles.map((v) => ({
      id: v.vehicle_id,
      plateNumber: v.plate_number,
      vehicleType: v.vehicle_type, // CAR | MOTORCYCLE | TRICYCLE
      make: v.manufacturer,
      model: v.model,
      year: v.year_model ?? "",
      color: v.color ?? "",
      vinNumber: v.vin_number ?? "",
      currentMileage: v.current_mileage ?? "",
    })),
    orders: orders.map((o) => ({
      id: o.order_id, // "RO-12"
      rawId: o.raw_order_id,
      status: o.status,
      date: o.formatted_date,
      plateNumber: o.plate_number ?? null,
    })),
  };
}