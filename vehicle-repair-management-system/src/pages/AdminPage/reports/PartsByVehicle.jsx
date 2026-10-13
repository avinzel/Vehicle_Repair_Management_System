"use client"

import { useState } from "react";
import { AlertTriangle, Banknote, Check, ChevronsUpDown, Package, Wrench } from "lucide-react";
import { useReport } from "@/hooks/use-reports";
import { ReportState } from "@/components/reports/ReportState";
import { ReportCard } from "@/components/reports/ReportCards";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { formatPeso } from "@/utils/reportFormat";

const CHART_COLORS = ["#c2410c", "#2563eb", "#111827", "#d97706", "#16a34a", "#9ca3af"];

function getDonutSegments(model) {
  const topParts = model.parts.slice(0, 5);
  const parts = topParts.map((part, index) => ({
    key: part.part_id,
    label: part.part_name,
    value: part.total_used,
    color: CHART_COLORS[index % (CHART_COLORS.length - 1)],
  }));
  const otherUsed = model.parts.slice(5).reduce((sum, part) => sum + part.total_used, 0);
  if (otherUsed > 0) {
    parts.push({
      key: "other",
      label: "Other parts",
      value: otherUsed,
      color: CHART_COLORS[CHART_COLORS.length - 1],
    });
  }
  return parts;
}

function UsageDonut({ model }) {
  const [activeSegmentKey, setActiveSegmentKey] = useState(null);
  const [pinnedSegmentKey, setPinnedSegmentKey] = useState(null);
  const total = model.total_used;
  const segments = getDonutSegments(model);
  const circumference = 2 * Math.PI * 36;
  const activeSegment = segments.find((segment) => segment.key === activeSegmentKey);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-label={`Parts usage distribution for ${model.vehicle_model}`}>
          <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" className="text-secondary" strokeWidth="13" />
          {segments.map((segment, index) => {
            const length = total > 0 ? (segment.value / total) * circumference : 0;
            const segmentOffset = segments
              .slice(0, index)
              .reduce((sum, item) => sum + (total > 0 ? (item.value / total) * circumference : 0), 0);
            return (
              <circle
                key={segment.key}
                cx="50"
                cy="50"
                r="36"
                fill="none"
                stroke={segment.color}
                strokeWidth={activeSegmentKey === segment.key ? 16 : 13}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-segmentOffset}
                className="cursor-pointer transition-[stroke-width] focus:outline-none"
                role="button"
                tabIndex={0}
                aria-label={`${segment.label}: ${segment.value} units, ${total > 0 ? Math.round((segment.value / total) * 100) : 0}%`}
                aria-pressed={pinnedSegmentKey === segment.key}
                onPointerEnter={() => setActiveSegmentKey(segment.key)}
                onPointerLeave={() => {
                  if (!pinnedSegmentKey) setActiveSegmentKey(null);
                }}
                onFocus={() => setActiveSegmentKey(segment.key)}
                onBlur={() => {
                  if (!pinnedSegmentKey) setActiveSegmentKey(null);
                }}
                onClick={() => {
                  const nextKey = pinnedSegmentKey === segment.key ? null : segment.key;
                  setPinnedSegmentKey(nextKey);
                  setActiveSegmentKey(nextKey);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    const nextKey = pinnedSegmentKey === segment.key ? null : segment.key;
                    setPinnedSegmentKey(nextKey);
                    setActiveSegmentKey(nextKey);
                  }
                }}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold tabular-nums">{total}</span>
          <span className="text-xs text-muted-foreground">units used</span>
        </div>
        {activeSegment && (
          <div
            role="status"
            className="absolute -top-2 left-1/2 z-10 w-max max-w-56 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-3 py-2 text-center text-xs text-background shadow-lg"
          >
            <span className="block font-semibold">{activeSegment.label}</span>
            <span>
              {activeSegment.value} {activeSegment.value === 1 ? "unit" : "units"}
              {total > 0 && ` · ${((activeSegment.value / total) * 100).toFixed(1)}%`}
            </span>
          </div>
        )}
      </div>
      <div className="w-full min-w-0 space-y-2">
        {segments.map((segment) => (
          <div key={segment.key} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
            <span className="min-w-0 flex-1 truncate" title={segment.label}>{segment.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {segment.value} · {total > 0 ? Math.round((segment.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StockBadge({ part }) {
  if (part.quantity_on_hand <= 5) {
    return <Badge variant="outline" className="border-red-200 bg-red-100 text-red-800">{part.quantity_on_hand} · Low stock</Badge>;
  }
  if (part.quantity_on_hand <= 20) {
    return <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-800">{part.quantity_on_hand} · Moderate</Badge>;
  }
  return <Badge variant="outline" className="border-green-200 bg-green-100 text-green-800">{part.quantity_on_hand} · In stock</Badge>;
}

function PartsTable({ model }) {
  return (
    <div className="parts-report-scroll max-h-[28rem] overflow-auto rounded-lg border border-border">
      <table className="w-full min-w-[620px] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="sticky top-0 z-20 border-b bg-card px-3 py-3 text-left font-medium">Part Name</th>
            <th scope="col" className="sticky top-0 z-20 border-b bg-card px-3 py-3 text-left font-medium">Stock Level</th>
            <th scope="col" className="sticky top-0 z-20 border-b bg-card px-3 py-3 text-right font-medium">Unit Price</th>
            <th scope="col" className="sticky top-0 z-20 border-b bg-card px-3 py-3 text-right font-medium">Total Used</th>
          </tr>
        </thead>
        <tbody>
          {model.parts.map((part) => (
            <tr key={part.part_id} className="border-b last:border-0 align-top hover:bg-muted/30">
              <td className="px-3 py-4">
                <p className="font-medium">{part.part_name}</p>
                <p className="mt-1 max-w-64 text-xs text-muted-foreground" title={part.associated_services || undefined}>
                  {part.associated_services
                    ? `Recorded jobs: ${part.associated_services}`
                    : "No associated job recorded"}
                </p>
              </td>
              <td className="px-3 py-4"><StockBadge part={part} /></td>
              <td className="px-3 py-4 text-right tabular-nums">{formatPeso(part.unit_price)}</td>
              <td className="px-3 py-4 text-right tabular-nums">
                <span className="font-semibold">{part.total_used}</span>
                <span className="block text-xs text-muted-foreground">{formatPeso(part.total_cost)} total</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VehicleUsagePanel({ model }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{model.vehicle_model}</h3>
          <p className="text-sm text-muted-foreground">All {model.parts.length} part types, ranked by issued quantity</p>
        </div>
        <p className="text-sm text-muted-foreground">{model.total_used} total units</p>
      </div>
      {model.parts.length > 0 ? (
        <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(230px,0.8fr)_minmax(0,1.4fr)]">
          <section
            className="flex min-w-0 flex-col rounded-xl border border-border bg-muted/20 p-4"
            aria-label={`Parts usage chart for ${model.vehicle_model}`}
          >
            <h4 className="text-sm font-medium text-muted-foreground">Usage distribution</h4>
            <UsageDonut model={model} />
          </section>
          <section
            className="min-w-0 rounded-xl border border-border p-4"
            aria-label={`Parts usage list for ${model.vehicle_model}`}
          >
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Part details</h4>
              <PartsTable model={model} />
            </div>
          </section>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No issued parts found for this vehicle model.</p>
      )}
    </div>
  );
}

const METRICS = [
  {
    key: "total_used",
    label: "Total Parts Used",
    hint: "issued to this vehicle model",
    icon: Package,
    iconClass: "bg-blue-50 text-blue-600",
    valueClass: "text-blue-600",
    format: (value) => `${value} ${value === 1 ? "unit" : "units"}`,
  },
  {
    key: "total_cost",
    label: "Total Parts Cost",
    hint: "based on recorded issue prices",
    icon: Banknote,
    iconClass: "bg-primary/10 text-primary",
    valueClass: "text-primary",
    format: formatPeso,
  },
  {
    key: "most_common",
    label: "Most Common Issue",
    hint: "most frequently issued part",
    icon: Wrench,
    iconClass: "bg-amber-50 text-amber-600",
    valueClass: "text-foreground",
    format: (value) => value,
  },
];

function MetricCard({ metric, model }) {
  const Icon = metric.icon;
  const value = metric.key === "most_common"
    ? model.parts[0]?.part_name ?? "No parts recorded"
    : metric.format(model[metric.key]);
  const alert = metric.key === "total_used" && model.parts.some((part) => part.quantity_on_hand <= 5);

  return (
    <Card className="h-full">
      <CardContent className="pt-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">{metric.label}</p>
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${alert ? "bg-red-50 text-red-600" : metric.iconClass}`}>
            {alert ? <AlertTriangle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
          </div>
        </div>
        <p className={`mt-1 truncate text-2xl font-bold ${alert ? "text-red-600" : metric.valueClass}`} title={value}>
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
      </CardContent>
    </Card>
  );
}

export function PartsByVehicleTab() {
  const report = useReport("parts-by-vehicle");
  const [selectedModelName, setSelectedModelName] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  return (
    <ReportState
      report={report}
      isEmpty={(data) => (data.models ?? []).length === 0}
      emptyMessage="No parts have been issued to a vehicle model yet."
    >
      {(data) => {
        const models = data.models ?? [];
        const sortedModels = [...models].sort((a, b) => a.vehicle_model.localeCompare(b.vehicle_model));
        const selectedModel =
          sortedModels.find((model) => model.vehicle_model === selectedModelName) ?? sortedModels[0];
        const filteredModels = sortedModels.filter((model) =>
          model.vehicle_model.toLowerCase().includes(modelSearch.trim().toLowerCase())
        );

        return (
          <ReportCard
            title="Parts by Vehicle"
            description="Review parts usage, recorded jobs, costs, and stock for each vehicle model."
            action={
              <Popover
                open={modelPickerOpen}
                onOpenChange={(open) => {
                  setModelPickerOpen(open);
                  if (open) setModelSearch("");
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={modelPickerOpen}
                    aria-label="Select vehicle model"
                    className="w-56 max-w-[65vw] justify-between font-normal bg-background"
                  >
                    <span className="truncate">{selectedModel?.vehicle_model ?? "Select a vehicle"}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="end">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search vehicle models..."
                      value={modelSearch}
                      onValueChange={setModelSearch}
                    />
                    <CommandList>
                      {filteredModels.length === 0 && <CommandEmpty>No vehicle model found.</CommandEmpty>}
                      <CommandGroup>
                        {filteredModels.map((model) => (
                          <CommandItem
                            key={model.vehicle_model}
                            value={model.vehicle_model}
                            onSelect={() => {
                              setSelectedModelName(model.vehicle_model);
                              setModelPickerOpen(false);
                              setModelSearch("");
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${selectedModel?.vehicle_model === model.vehicle_model ? "opacity-100" : "opacity-0"}`} />
                            <span className="truncate">{model.vehicle_model}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            }
          >
            {selectedModel && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {METRICS.map((metric) => <MetricCard key={metric.key} metric={metric} model={selectedModel} />)}
                </div>
                <VehicleUsagePanel key={selectedModel.vehicle_model} model={selectedModel} />
              </div>
            )}
          </ReportCard>
        );
      }}
    </ReportState>
  );
}
