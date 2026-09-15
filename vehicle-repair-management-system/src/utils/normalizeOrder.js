// utils/normalizeOrder.js
export function normalizeOrder(raw) {
  if (!raw) return raw;

    const vehicleDisplay = raw.vehicle_info
    ? raw.vehicle_info.split(' · ')[0]
    : (raw.vehicle ?? null);

  return {
    ...raw, // keep anything not explicitly mapped below
    id: raw.order_id ?? raw.orderId ?? raw.id,
    rawId: raw.raw_order_id ?? raw.rawId ?? null,
    customer: raw.customer_name ?? raw.customer ?? null,
    vehicle: vehicleDisplay,
    plateNumber: raw.plate_number ?? raw.plateNumber ?? null,
    vehicleType: raw.vehicle_type ?? raw.vehicleType ?? null,
    date: raw.formatted_date ?? raw.date ?? null,
    status: raw.status ?? null,
  };
}