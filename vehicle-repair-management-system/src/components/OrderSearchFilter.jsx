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
  "Pending Parts",
];

export function OrderFilterBar({ search, onSearchChange, statusFilter, onStatusFilterChange }) {
  const tabs = ["All", ...ORDER_STATUSES];
 
  return (
    <div className="py-6 px-6 space-y-3 ">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by order ID, customer, or vehicle..."
          className="pl-9"
        />
      </div>
 
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = statusFilter === tab;
          return (
            <Button
              key={tab}
              type="button"
              size="sm"
              variant={isActive ? "default" : "secondary"}
              onClick={() => onStatusFilterChange(tab)}
              className="rounded-full"
            >
              {tab}
            </Button>
          );
        })}
      </div>
    </div>
  );
}