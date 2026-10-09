"use client"

import { useMemo } from "react";
import { useReport } from "@/hooks/use-reports";
import { ReportState } from "@/components/reports/ReportState";
import { ReportCard } from "@/components/reports/ReportCards";
import { BarRow } from "@/components/reports/BarRow";
import { StatusBadge } from "@/components/StatusBadge";
import { initials, AVATAR_COLORS } from "@/utils/reportFormat";

const LOAD_HEIGHT = 96; // px, tallest bar in the load chart

function Avatar({ name, color, size = "w-9 h-9" }) {
  return (
    <div className={`${size} rounded-full ${color} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
      {initials(name)}
    </div>
  );
}

function LoadChart({ mechanics }) {
  const max = Math.max(1, ...mechanics.flatMap((m) => [m.active_count, m.done_count]));

  return (
    <div>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, mechanics.length)}, minmax(0, 1fr))` }}
      >
        {mechanics.map((m, i) => (
          <div key={m.mechanic_id} className="flex flex-col items-center text-center gap-1">
            <div className="flex items-end gap-1.5" style={{ height: LOAD_HEIGHT }}>
              <div
                className="w-5 rounded-t-sm bg-blue-400"
                style={{ height: (m.active_count / max) * LOAD_HEIGHT }}
              />
              <div
                className="w-5 rounded-t-sm bg-green-400"
                style={{ height: (m.done_count / max) * LOAD_HEIGHT }}
              />
            </div>
            <Avatar name={m.full_name} color={AVATAR_COLORS[i % AVATAR_COLORS.length]} />
            <p className="text-sm font-medium">{m.full_name.split(" ")[0]}</p>
            <p className="text-xs text-muted-foreground">{m.position_name ?? "—"}</p>
            <p className="text-xs">
              <span className="font-bold text-blue-600">{m.active_count}</span>
              <span className="text-muted-foreground"> Active · </span>
              <span className="font-bold text-green-600">{m.done_count}</span>
              <span className="text-muted-foreground"> Done</span>
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 border-t border-border mt-5 pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400" />Active orders</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-400" />Completed</span>
      </div>
    </div>
  );
}

export function MechanicsTab() {
  const report = useReport("mechanics");

  return (
    <ReportState
      report={report}
      isEmpty={(d) => (d.mechanics ?? []).length === 0}
      emptyMessage="No active mechanics yet."
    >
      {(d) => <MechanicsContent data={d} />}
    </ReportState>
  );
}

function MechanicsContent({ data }) {
  const mechanics = data.mechanics ?? [];

  const ordersByMechanic = useMemo(() => {
    const map = {};
    for (const a of data.assignments ?? []) {
      (map[a.mechanic_id] ??= []).push(a);
    }
    return map;
  }, [data.assignments]);

  return (
    <div className="space-y-6">
      <ReportCard title="Mechanic Order Load" description="Active vs. completed orders per mechanic">
        <LoadChart mechanics={mechanics} />
      </ReportCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {mechanics.map((m, i) => {
          const orders = ordersByMechanic[m.mechanic_id] ?? [];
          return (
            <ReportCard key={m.mechanic_id}>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={m.full_name} color={AVATAR_COLORS[i % AVATAR_COLORS.length]} size="w-10 h-10" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{m.full_name}</p>
                      <p className="text-xs text-muted-foreground">{m.position_name ?? "—"}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold leading-none">{m.completion_rate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">completion rate</p>
                  </div>
                </div>

                <BarRow layout="inline" value={m.completion_rate} max={100} />

                {orders.length > 0 ? (
                  <div className="space-y-2.5 max-h-40 overflow-y-auto pr-2">
                    {orders.map((o) => (
                      <div key={`${o.raw_order_id}-${o.position_name}`} className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs text-muted-foreground shrink-0">{o.order_number}</span>
                          <span className="truncate">{o.customer_name}</span>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No orders assigned.</p>
                )}
              </div>
            </ReportCard>
          );
        })}
      </div>
    </div>
  );
}