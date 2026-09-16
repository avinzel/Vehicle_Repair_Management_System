export function MechanicChip({ name, role }) {
  const initial = name?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
        {initial}
      </div>
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}