import { useState, useEffect, useCallback, useRef } from "react";

const API = "http://localhost:8000/api.php";

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

async function request(url) {
  const res = await fetch(url, { credentials: "include" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.status === "error") {
    throw new Error(json.error ?? json.message ?? `Request failed (HTTP ${res.status})`);
  }
  return json;
}

// GET action=reports&category=<category>  ->  { status, data, ... }
function fetchReport(category, params = {}) {
  const qs = new URLSearchParams({ action: "reports", category, ...params });
  return request(`${API}?${qs}`);
}

// MySQL via PHP often sends numbers as strings ("1250.00"), and the tabs do
// math on them, so every numeric field goes through num().
const num = (v) => Number(v) || 0;
const rows = (data) => (Array.isArray(data) ? data : []);
const one = (data) => (Array.isArray(data) ? data[0] ?? {} : data ?? {});

// ---------------------------------------------------------------------------
// Loaders: one per tab. Column names below are the real ones returned by the
// stored procedures (see Reports.php / the SP definitions).
// ---------------------------------------------------------------------------

// OverviewTab
//   admin-cards            sp_get_dashboard_summary_cards
//   top-revenue-by-order   sp_get_revenue_by_order
//   revenue-split          sp_get_revenue_split
async function loadOverview() {
  const [cards, revenue, split] = await Promise.all([
    fetchReport("admin-cards"),
    fetchReport("top-revenue-by-order", { limit: 10 }),
    fetchReport("revenue-split"),
  ]);

  const c = one(cards.data);
  const s = one(split.data);

  return {
    total_revenue: num(c.total_revenue),
    fulfilled_count: num(c.fulfilled_orders_count),
    active_orders: num(c.active_orders_count),
    avg_order_value: num(c.avg_order_value),
    inventory_value: num(c.total_inventory_value),
    sku_count: num(c.total_part_skus),
    labor_total: num(s.labor_total),
    parts_total: num(s.parts_total),
    orders: rows(revenue.data).map((o) => ({
      raw_order_id: o.order_id,
      order_number: o.formatted_order_id,
      customer_name: o.customer_name,
      amount: num(o.billed_amount),
      status: o.status,
    })),
  };
}

// PipelineTab: pipeline-status-analytics (sp_get_pipeline_status_counts_overall)
// Returns all 10 statuses: status_code, display_label, short_label,
// display_order, count, share_percentage. `status` must equal the status keys
// in PIPELINE / OFF_PIPELINE (@/constant/pipeline), e.g. "PENDING_DIAGNOSIS".
async function loadPipeline() {
  const json = await fetchReport("pipeline-status-analytics");
  return {
    stages: rows(json.data).map((r) => ({
      status: r.status_code,
      count: num(r.count),
    })),
  };
}

// MechanicsTab
//   mechanics-order-load  sp_mechanic_order_load: mechanic_id, full_name,
//                         position_name, active_orders, completed_orders
//   mechanics-cards       one card per mechanic: completion_rate and
//                         orders[{ order_id, order_code, customer_name, status }]
async function loadMechanics() {
  const [load, cards] = await Promise.all([
    fetchReport("mechanics-order-load"),
    fetchReport("mechanics-cards", { limit_recent_order: 10 }),
  ]);

  const byId = new Map();
  for (const r of rows(load.data)) {
    byId.set(r.mechanic_id, {
      mechanic_id: r.mechanic_id,
      full_name: r.full_name,
      position_name: r.position_name ?? null,
      active_count: num(r.active_orders),
      done_count: num(r.completed_orders),
      completion_rate: null,
    });
  }

  const assignments = [];
  for (const card of rows(cards.data)) {
    const existing = byId.get(card.mechanic_id);
    byId.set(card.mechanic_id, {
      // mechanics that only appear in the cards still get a row
      mechanic_id: card.mechanic_id,
      full_name: card.full_name,
      position_name: card.position_name ?? null,
      active_count: existing?.active_count ?? Math.max(0, num(card.total_orders) - num(card.completed_orders)),
      done_count: existing?.done_count ?? num(card.completed_orders),
      completion_rate: num(card.completion_rate),
    });

    for (const o of card.orders ?? []) {
      assignments.push({
        mechanic_id: card.mechanic_id,
        raw_order_id: o.order_id,
        order_number: o.order_code,
        customer_name: o.customer_name,
        status: o.status,
        position_name: card.position_name ?? null,
      });
    }
  }

  const mechanics = [...byId.values()].map((m) => ({
    ...m,
    // fall back to done / (active + done) if the card didn't supply a rate
    completion_rate:
      m.completion_rate ??
      (m.active_count + m.done_count > 0
        ? Math.round((m.done_count / (m.active_count + m.done_count)) * 100)
        : 0),
  }));

  return { mechanics, assignments };
}

// PartsUsageTab
//   parts-inventory-cards  sp_get_parts_inventory_cards:
//                          total_skus, inventory_value, low_stock_count
//   top-parts-used         sp_top_parts_used: part_id, part_name, total_used
//   action=parts           stock list (there is no report category for it)
async function loadPartsUsage() {
  const [cards, top, partsList] = await Promise.all([
    fetchReport("parts-inventory-cards"),
    fetchReport("top-parts-used", { limit: 10 }),
    request(`${API}?action=parts&status=ACTIVE`),
  ]);

  const c = one(cards.data);

  const stock = rows(partsList.data)
    .map((p) => ({
      part_id: p.part_id,
      part_code: p.formatted_part_id ?? `P-${String(p.part_id).padStart(3, "0")}`,
      part_name: p.part_name,
      quantity_on_hand: num(p.quantity_on_hand),
      reorder_level: num(p.reorder_level),
    }))
    .sort((a, b) => a.quantity_on_hand - b.quantity_on_hand); // lowest first

  return {
    summary: {
      total_skus: num(c.total_skus),
      inventory_value: num(c.inventory_value),
      low_stock: num(c.low_stock_count),
    },
    top_used: rows(top.data).map((p) => ({
      part_id: p.part_id,
      part_name: p.part_name,
      total_used: num(p.total_used),
    })),
    stock,
  };
}

// AdminDashboardTab
//   admin-cards      sp_get_dashboard_summary_cards
//   pipeline-status  sp_get_pipeline_status_counts: one row, a column per status
//                    (pending_diagnosis, awaiting_diagnosis, ... ready_for_release)
//   recent-orders    sp_get_recent_repair_orders: formatted_order_id,
//                    raw_order_id, customer_name, status, date_received,
//                    estimated_or_actual_total (cancelled orders excluded,
//                    newest first, no vehicle column)
const DASHBOARD_RECENT_LIMIT = 6;

async function loadDashboard() {
  const [cards, pipeline, recent] = await Promise.all([
    fetchReport("admin-cards"),
    fetchReport("pipeline-status"),
    fetchReport("recent-orders", { limit: DASHBOARD_RECENT_LIMIT }),
  ]);

  const c = one(cards.data);

  return {
    totalRevenue: num(c.total_revenue),
    fulfilledOrders: num(c.fulfilled_orders_count),
    activeOrders: num(c.active_orders_count),
    activeStaff: num(c.active_staff_count),
    totalStaff: num(c.total_staff_count),
    lowStockCount: num(c.low_stock_alerts_count),
    // { PENDING_DIAGNOSIS: 2, IN_PROGRESS: 5, ... }
    pipeline: Object.fromEntries(
      Object.entries(one(pipeline.data)).map(([status, count]) => [status.toUpperCase(), num(count)])
    ),
    recentOrders: rows(recent.data).map((o) => ({
      raw_order_id: o.raw_order_id,
      order_id: o.formatted_order_id,
      customer: o.customer_name,
      status: o.status,
      amount: o.estimated_or_actual_total === null ? null : num(o.estimated_or_actual_total),
    })),
  };
}

const LOADERS = {
  dashboard: loadDashboard,
  overview: loadOverview,
  pipeline: loadPipeline,
  mechanics: loadMechanics,
  "parts-usage": loadPartsUsage,
};

// ---------------------------------------------------------------------------
// Hook
//   const report = useReport("overview");
//   -> { data, loading, error, refetch }
// ---------------------------------------------------------------------------
export function useReport(key) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const requestId = useRef(0); // ignore responses from a previous key / unmounted tab

  const load = useCallback(async () => {
    const loader = LOADERS[key];
    const id = ++requestId.current;

    if (!loader) {
      setState({ data: null, loading: false, error: `Unknown report "${key}"` });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await loader();
      if (id === requestId.current) setState({ data, loading: false, error: null });
    } catch (err) {
      console.error(`Failed to load report "${key}"`, err);
      if (id === requestId.current) {
        setState({ data: null, loading: false, error: err.message || "Failed to load report" });
      }
    }
  }, [key]);

  useEffect(() => {
    load();
    return () => {
      requestId.current++; // invalidate any in-flight request
    };
  }, [load]);

  return { ...state, refetch: load };
}