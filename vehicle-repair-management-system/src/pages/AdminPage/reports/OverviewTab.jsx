"use client"

import { DollarSign, FileText, Activity, Package } from "lucide-react";
import { useReport } from "@/hooks/use-reports";
import { ReportState } from "@/components/reports/ReportState";
import { ReportCard } from "@/components/reports/ReportCards";
import { StatCard } from "@/components/reports/StatCard";
import { BarRow } from "@/components/reports/BarRow";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPeso, pluralize } from "@/utils/reportFormat";

export function OverviewTab() {
  const report = useReport("overview");

  return (
    <ReportState report={report}>
      {(d) => {
        const orders = d.orders ?? [];
        const maxAmount = Math.max(0, ...orders.map((o) => o.amount));

        const split = d.labor_total + d.parts_total;
        const laborPct = split > 0 ? Math.round((d.labor_total / split) * 100) : 0;
        const partsPct = split > 0 ? 100 - laborPct : 0;

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Revenue"
                value={formatPeso(d.total_revenue)}
                sublabel={`${pluralize(d.fulfilled_count, "fulfilled order")}`}
                icon={DollarSign}
                tone="primary"
              />
              <StatCard
                label="Active Orders"
                value={d.active_orders}
                sublabel="currently in pipeline"
                icon={FileText}
                tone="blue"
              />
              <StatCard
                label="Avg Order Value"
                value={formatPeso(d.avg_order_value)}
                sublabel="per completed repair"
                icon={Activity}
                tone="purple"
              />
              <StatCard
                label="Inventory Value"
                value={formatPeso(d.inventory_value)}
                sublabel={`${pluralize(d.sku_count, "part SKU")} on hand`}
                icon={Package}
                tone="green"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
              <ReportCard
                title="Revenue by Order"
                description="Top orders by invoiced amount (estimated for orders not yet invoiced)"
              >
                {orders.length > 0 ? (
                  <div className="space-y-3">
                    {orders.map((o) => (
                      <BarRow
                        key={o.raw_order_id}
                        layout="inline"
                        code={o.order_number}
                        label={o.customer_name}
                        value={o.amount}
                        max={maxAmount}
                        display={formatPeso(o.amount)}
                        trailing={<StatusBadge status={o.status} />}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">No billed orders yet.</p>
                )}
              </ReportCard>

              <ReportCard title="Revenue Split" description="Paid invoices, labor vs parts">
                <div className="space-y-4">
                  <BarRow
                    label={`Labor (${laborPct}%)`}
                    value={d.labor_total}
                    max={split}
                    display={formatPeso(d.labor_total)}
                    colorClass="bg-primary"
                  />
                  <BarRow
                    label={`Parts (${partsPct}%)`}
                    value={d.parts_total}
                    max={split}
                    display={formatPeso(d.parts_total)}
                    colorClass="bg-orange-300"
                  />
                  <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold">{formatPeso(split)}</span>
                  </div>
                </div>
              </ReportCard>
            </div>
          </div>
        );
      }}
    </ReportState>
  );
}