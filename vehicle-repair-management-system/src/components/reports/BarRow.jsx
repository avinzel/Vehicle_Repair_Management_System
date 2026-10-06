// components/reports/BarRow.jsx
//
// One horizontal bar row. Used by Revenue by Order, Revenue Split, Top
// Parts Used, Current Stock Levels and the completion-rate bar on mechanic
// cards. Everything except `value` is optional, so one component covers
// all the layouts:
//
//   rank      -> "1"          (Top Parts Used)
//   code      -> "P-009"      (stock levels / order ids, rendered mono)
//   label     -> "Timing Belt"
//   display   -> text at the right of the label row ("5 used", "₱9,500")
//   trailing  -> any node after it (e.g. a StatusBadge)
//   layout    -> "stacked": label row above a full-width bar
//                "inline" : [code] label [bar] display trailing, one line
//
// `max` is the value that fills the bar 100%. Pass the max of the whole
// list so bars are comparable across rows.

function pct(value, max) {
  const v = Number(value) || 0;
  const m = Number(max) || 0;
  if (m <= 0 || v <= 0) return 0;
  return Math.min(100, (v / m) * 100);
}

export function BarRow({
  value,
  max,
  label,
  display,
  rank,
  code,
  trailing,
  colorClass = "bg-primary",
  layout = "stacked",
  className = "",
}) {
  const width = pct(value, max);

  const bar = (
    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${colorClass}`}
        style={{ width: `${width}%` }}
        role="presentation"
      />
    </div>
  );

  if (layout === "inline") {
    return (
      <div className={`flex items-center gap-3 text-sm ${className}`}>
        {code && <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{code}</span>}
        {label && <span className="w-32 shrink-0 truncate">{label}</span>}
        <div className="flex-1 min-w-0">{bar}</div>
        {display != null && <span className="w-20 shrink-0 text-right font-semibold">{display}</span>}
        {trailing && <div className="shrink-0">{trailing}</div>}
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          {rank != null && <span className="w-4 text-xs text-muted-foreground">{rank}</span>}
          {code && <span className="font-mono text-xs text-muted-foreground shrink-0">{code}</span>}
          <span className="truncate">{label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {display != null && <span className="font-semibold">{display}</span>}
          {trailing}
        </div>
      </div>
      {bar}
    </div>
  );
}