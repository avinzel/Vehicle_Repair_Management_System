import React from 'react';
import { BarChart3 } from 'lucide-react';

export function Reports() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4 animate-in fade-in duration-500">
      <div className="p-4 bg-primary/10 rounded-full">
        <BarChart3 className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Comprehensive Reporting</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          The shop-wide financial and operational reporting module is under development. Routing is active.
        </p>
      </div>
    </div>
  );
}