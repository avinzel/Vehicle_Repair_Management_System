"use client"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

// Generic shell only — open/close mechanics and sizing live here. Layout
// (header, sections, actions) is entirely up to whatever contextual
// component is passed as children, since different pages (repair orders,
// customers, order history) need genuinely different drawer layouts, not
// just different data poured into one fixed template.
export function DetailDrawer({ open, onOpenChange, children, side = "right", className = "" }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side={side}
        withOverlay={false}
        className={`w-full sm:max-w-lg overflow-y-auto p-0 ${className}`}
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}