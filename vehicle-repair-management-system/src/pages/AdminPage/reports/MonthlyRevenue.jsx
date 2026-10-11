"use client"

import { useState } from "react";
import { Banknote, CalendarDays, TrendingUp } from "lucide-react";
import { useReport } from "@/hooks/use-reports";
import { ReportState } from "@/components/reports/ReportState";
import { ReportCard } from "@/components/reports/ReportCards";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPeso } from "@/utils/reportFormat";

const CHART_HEIGHT = 224;

function RevenueSummaryCard({ label, value, hint, icon: Icon, iconClass, valueClass }) {
  return (
    <Card className="h-full">
      <CardContent className="pt-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className={`mt-1 truncate text-2xl font-bold ${valueClass}`} title={value}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function MonthlyRevenueTab() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const report = useReport("monthly-revenue", { year });

  return (
    <ReportState report={report}>
      {(data) => {
        const months = data.months ?? [];
        const maxRevenue = Math.max(0, ...months.map((month) => Number(month.revenue) || 0));
        const axisMaximum = maxRevenue || 1;
        const years = Array.from({ length: 10 }, (_, index) => currentYear - index);
        const axisValues = [axisMaximum, axisMaximum / 2, 0];
        const totalRevenue = Number(data.total_revenue) || 0;
        const peakMonth = months.reduce(
          (peak, month) => Number(month.revenue) > Number(peak?.revenue ?? 0) ? month : peak,
          null
        );
        const monthlyAverage = months.length > 0 ? totalRevenue / 12 : 0;

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <RevenueSummaryCard
                label={`${data.year} Revenue`}
                value={formatPeso(totalRevenue)}
                hint="total from paid invoices"
                icon={Banknote}
                iconClass="bg-primary/10 text-primary"
                valueClass="text-primary"
              />
              <RevenueSummaryCard
                label="Peak Month"
                value={formatPeso(Number(peakMonth?.revenue) || 0)}
                hint={peakMonth ? `${peakMonth.label} · highest revenue` : "no monthly revenue"}
                icon={TrendingUp}
                iconClass="bg-green-50 text-green-600"
                valueClass="text-green-600"
              />
              <RevenueSummaryCard
                label="Monthly Average"
                value={formatPeso(monthlyAverage)}
                hint="year total divided across 12 months"
                icon={CalendarDays}
                iconClass="bg-blue-50 text-blue-600"
                valueClass="text-blue-600"
              />
            </div>
            <ReportCard
              title="Monthly Revenue"
              description={`Paid invoice revenue by month in ${data.year}`}
              action={
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Year</span>
                  <Select value={year} onValueChange={(value) => value && setYear(value)}>
                    <SelectTrigger className="w-28 bg-background" aria-label="Select revenue year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              }
            >
              <div
                className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 sm:gap-x-4"
              >
                <div
                  aria-hidden="true"
                  className="flex flex-col justify-between text-right text-[10px] text-muted-foreground sm:text-xs"
                  style={{ height: CHART_HEIGHT }}
                >
                  {axisValues.map((value, index) => (
                    <span key={index}>{formatPeso(value)}</span>
                  ))}
                </div>

                <div className="relative min-w-0">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between border-b border-border/70"
                    style={{ height: CHART_HEIGHT }}
                  >
                    {axisValues.map((value, index) => (
                      <span key={index} className="block w-full border-t border-dashed border-border/70" />
                    ))}
                  </div>
                  <div
                    className="relative grid grid-cols-12 items-end gap-1 sm:gap-2"
                    style={{ height: CHART_HEIGHT }}
                  >
                    {months.map((month, index) => {
                      const revenue = Number(month.revenue) || 0;
                      const height = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                      return (
                        <div
                          key={month.month}
                          className={`group relative flex h-full min-w-0 items-end justify-center ${index > 0 && index % 3 === 0 ? "border-l border-border/70" : ""}`}
                        >
                          <button
                            type="button"
                            aria-label={`${month.label}: ${formatPeso(revenue)}`}
                            title={`${month.label}: ${formatPeso(revenue)}`}
                            className="relative z-10 flex h-full w-full max-w-10 items-end justify-center bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {revenue > 0 ? (
                              <>
                                <span
                                  className="pointer-events-none absolute left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md group-hover:block group-focus-within:block"
                                  style={{ bottom: `calc(${height}% + 0.5rem)` }}
                                >
                                  {month.label}: {formatPeso(revenue)}
                                </span>
                                <span
                                  className="pointer-events-none absolute left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap text-[9px] font-medium tabular-nums text-muted-foreground lg:block"
                                  aria-hidden="true"
                                  style={{ bottom: `calc(${height}% + 0.25rem)` }}
                                >
                                  {formatPeso(revenue)}
                                </span>
                                <span
                                  className="absolute bottom-0 block w-full rounded-t-md bg-primary/80 transition-colors group-hover:bg-primary group-focus-within:bg-primary"
                                  style={{ height: `${Math.max(height, 1.5)}%` }}
                                />
                              </>
                            ) : (
                              <span className="mb-0.5 block h-px w-3 bg-border" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 grid grid-cols-12 gap-1 sm:gap-2">
                    {months.map((month, index) => (
                      <span
                        key={month.month}
                        className={`truncate text-center text-[10px] text-muted-foreground sm:text-xs ${index > 0 && index % 3 === 0 ? "border-l border-border/70" : ""}`}
                        title={month.label}
                      >
                        {String(month.label ?? "").slice(0, 3)}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-4 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                    {["Q1", "Q2", "Q3", "Q4"].map((quarter, index) => (
                      <span key={quarter} className={`text-center ${index > 0 ? "border-l border-border/70" : ""}`}>
                        {quarter}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </ReportCard>
          </div>
        );
      }}
    </ReportState>
  );
}
