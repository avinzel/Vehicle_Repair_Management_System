import React from 'react';
import { Boxes } from 'lucide-react';
export function PartsInventory() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4 animate-in fade-in duration-500">
      <div className="p-4 bg-primary/10 rounded-full">
        <Boxes className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Parts Inventory Management</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          The direct-deduct inventory CRUD interface is currently under development. Routing is active.
        </p>
      </div>
    </div>
  );
}