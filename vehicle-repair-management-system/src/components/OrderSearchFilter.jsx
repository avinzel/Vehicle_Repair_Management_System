"use client"

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Single source of truth for the repair order pipeline stages. Order
// History and the Mechanic interface's own order list should import this
// same list so filtering stays consistent everywhere it's used, rather
// than each screen defining its own copy that can drift out of sync.
export const ORDER_STATUSES = [
  "Pending Diagnosis",
  "Awaiting Diagnosis",
  "Pending Mechanics",
  "In Progress",
  "Awaiting Parts",
];

// Case-insensitive "does any field contain the query" check. Empty query
// matches everything; null/undefined fields are skipped.
//   matchesSearch(search, row.name, row.email, row.code)
export function matchesSearch(query, ...fields) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f != null && String(f).toLowerCase().includes(q));
}

// Builds the { [pillLabel]: count } map for the optional `counts` prop.
// "All" is always the full list; every other key comes from getLabel(item),
// so it must return the same text used for the pill.
export function buildTabCounts(items, getLabel) {
  const counts = { All: items.length };
  for (const item of items) {
    const label = getLabel(item);
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return counts;
}

// Generic search box + pill row. Used by the order card lists and by the
// admin CRUD tables so the position and look stay identical everywhere.
//
// Place it in the sticky wrapper (same as ActiveRepairOrder):
//   <div className="sticky top-[73px] z-10 bg-card -mx-6 -mt-6 border-b border-border">
//     <FilterBar ... />
//   </div>
//
// `tabs` is a list of pill labels; the active pill's label is what
// `statusFilter` holds, so compare against it when filtering.
// Pass showTabs={false} (or no tabs) for a search-only bar.
export function FilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  placeholder = "Search...",
  tabs = [],
  counts,
  showTabs = true,
}) {
  return (
    <div className="py-6 px-6 space-y-3 ">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="pl-9"
        />
      </div>

      {showTabs && tabs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = statusFilter === tab;
            const count = counts?.[tab];
            return (
              <Button
                key={tab}
                type="button"
                size="sm"
                variant={isActive ? "default" : "secondary"}
                aria-pressed={isActive}
                onClick={() => onStatusFilterChange(tab)}
                className="rounded-full"
              >
                {tab}
                {count != null && <span className="ml-1.5 opacity-70">{count}</span>}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Repair-order flavour: same bar with the pipeline stages as pills.
// Existing usages (ActiveRepairOrder, etc.) keep working unchanged.
export function OrderFilterBar({
  placeholder = "Search by order ID, customer, or vehicle...",
  tabs = ["All", ...ORDER_STATUSES],
  ...rest
}) {
  return <FilterBar placeholder={placeholder} tabs={tabs} {...rest} />;
}