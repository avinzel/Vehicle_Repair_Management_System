import React from 'react';
import { Users} from 'lucide-react';

export function Staffs() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4 animate-in fade-in duration-500">
      <div className="p-4 bg-primary/10 rounded-full">
        <Users className="w-8 h-8 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">User & Role Management</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          The staff configuration module is currently under development. Routing is active.
        </p>
      </div>
    </div>
  );
}