"use client"

import { useReport } from "@/hooks/use-reports";
import { ReportState } from "@/components/reports/ReportState";
import { ReportCard } from "@/components/reports/ReportCards";
import { BarRow } from "@/components/reports/BarRow";
import { PIPELINE, OFF_PIPELINE } from "@/constant/pipeline";
import { pluralize } from "@/utils/reportFormat";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

const CHART_HEIGHT = "h-48";

// Plain CSS column chart: no chart library needed for 8 bars.
function StatusChart({ stages }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  const ticks = [...new Set([0, Math.ceil(max / 2), max])];

  return (
    <div className="flex gap-3 pt-6">
      <div className={`relative ${CHART_HEIGHT} w-5 shrink-0`}>
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute right-0 translate-y-1/2 text-xs text-muted-foreground"
            style={{ bottom: `${(t / max) * 100}%` }}
          >
            {t}
          </span>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <div className={`relative ${CHART_HEIGHT}`}>
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute left-0 right-0 border-t border-dashed border-border"
              style={{ bottom: `${(t / max) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-3">
            {stages.map((s) => (
              <div key={s.status} className="flex-1 h-full flex items-end">
                <div
                  className="w-full relative rounded-t-md transition-[height] duration-500"
                  style={{ height: `${(s.count / max) * 100}%`, backgroundColor: s.hex }}
                >
                  {s.count > 0 && (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold">
                      {s.count}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          {stages.map((s) => (
            <span key={s.status} className="flex-1 text-center text-xs text-muted-foreground truncate">
              {s.short}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PipelineTab() {
  const report = useReport("pipeline");

  return (
    <ReportState
      report={report}
      isEmpty={(d) => (d.stages ?? []).every((s) => s.count === 0)}
      emptyMessage="No repair orders yet."
    >
      {(d) => {
        const counts = Object.fromEntries((d.stages ?? []).map((s) => [s.status, s.count]));

        // Happy-path stages always show (even at 0). Off-pipeline statuses
        // (Awaiting Parts, Cancelled) only show when something is in them.
        const stages = [
          ...PIPELINE,
          ...OFF_PIPELINE.filter((s) => (counts[s.status] ?? 0) > 0),
        ].map((s) => ({ ...s, count: counts[s.status] ?? 0 }));

        const total = stages.reduce((sum, s) => sum + s.count, 0);

        return (
          <div className="space-y-6">
            <ReportCard
              title="Orders by Status"
              description={`${pluralize(total, "total order")} across all stages`}
            >
              <StatusChart stages={stages} />
            </ReportCard>

            <ReportCard title="Status Breakdown" contentClassName="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Count</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Share</TableHead>
                    <TableHead className="px-6 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stages.map((s) => {
                    const share = total > 0 ? Math.round((s.count / total) * 100) : 0;
                    return (
                      <TableRow key={s.status}>
                        <TableCell className="px-6">
                          <span className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold">{s.count}</TableCell>
                        <TableCell className="w-64">
                          <BarRow layout="inline" value={s.count} max={total} display={`${share}%`} colorClass={s.bar} />
                        </TableCell>
                        <TableCell className="px-6 text-right">
                          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.pill}`}>
                            {pluralize(s.count, "order")}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ReportCard>
          </div>
        );
      }}
    </ReportState>
  );
}