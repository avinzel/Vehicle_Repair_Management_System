"use client"

import { useState } from "react";
import { OrderFilterBar } from "@/components/OrderSearchFilter";

export function CustomerRecords() {
  const [search, setSearch] = useState("");

  return (
    <div className="w-full">
      {/* Full-bleed "second header": bg spans edge-to-edge regardless of
            how wide the parent layout is, matches ActiveRepairOrder's
            sticky filter bar treatment. */}
      <div className="sticky top-[73px] z-10 bg-card -mx-6 -mt-6 border-b border-border">
        <OrderFilterBar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search by name, phone, or vehicle..."
          showTabs={false}
        />
      </div>

      <div className="p-6">
        {/* customer table goes here */}
      </div>
    </div>
  );
}