"use client"

import { useReport } from "@/hooks/use-reports";
import { ReportState } from "@/components/reports/ReportState";
import { ReportCard } from "@/components/reports/ReportCards";
import { StatCard } from "@/components/reports/StatCard";
import { BarRow } from "@/components/reports/BarRow";
import { formatPeso } from "@/utils/reportFormat";

export function PartsUsageTab() {
  const report = useReport("parts-usage");

  return (
    <ReportState report={report}>
      {(d) => {
        const s = d.summary ?? {};
        const topUsed = d.top_used ?? [];
        const stock = d.stock ?? [];

        const maxUsed = Math.max(0, ...topUsed.map((p) => p.total_used));
        const maxStock = Math.max(0, ...stock.map((p) => p.quantity_on_hand));

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard centered label="Total SKUs" value={s.total_skus ?? 0} sublabel="part types tracked" />
              <StatCard centered label="Inventory Value" value={formatPeso(s.inventory_value)} sublabel="at current unit cost" tone="primary" />
              <StatCard
                centered
                label="Low Stock"
                value={s.low_stock ?? 0}
                sublabel="parts at or below reorder level"
                tone={(s.low_stock ?? 0) > 0 ? "red" : "green"}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <ReportCard title="Top Parts Used" description="By total quantity issued across all orders">
                {topUsed.length > 0 ? (
                  <div className="space-y-4">
                    {topUsed.map((p, i) => (
                      <BarRow
                        key={p.part_id}
                        rank={i + 1}
                        label={p.part_name}
                        value={p.total_used}
                        max={maxUsed}
                        display={`${p.total_used} used`}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">No parts have been issued yet.</p>
                )}
              </ReportCard>

              <ReportCard title="Current Stock Levels" description="All parts sorted by quantity, lowest first">
                {stock.length > 0 ? (
                  <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-2">
                    {stock.map((p) => {
                      const low = p.quantity_on_hand <= p.reorder_level;
                      return (
                        <BarRow
                          key={p.part_id}
                          code={p.part_code}
                          label={p.part_name}
                          value={p.quantity_on_hand}
                          max={maxStock}
                          display={p.quantity_on_hand}
                          colorClass={low ? "bg-yellow-400" : "bg-green-500"}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">No parts in inventory.</p>
                )}
              </ReportCard>
            </div>
          </div>
        );
      }}
    </ReportState>
  );
}