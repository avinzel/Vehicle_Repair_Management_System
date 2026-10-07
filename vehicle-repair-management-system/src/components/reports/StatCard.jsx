// components/reports/StatCard.jsx
//
// KPI tile. Two layouts:
//   - default: label top-left, icon top-right, big value, sublabel (Overview)
//   - centered: label, value, sublabel stacked and centered (Parts Usage)
//
// `tone` picks the value + icon-chip colors. Classes are literal strings so
// Tailwind can see them.

import { Card, CardContent } from "@/components/ui/card";

const TONES = {
  primary: { value: "text-primary",    chip: "bg-primary/10" },
  blue:    { value: "text-blue-600",   chip: "bg-blue-50" },
  purple:  { value: "text-purple-600", chip: "bg-purple-50" },
  green:   { value: "text-green-600",  chip: "bg-green-50" },
  amber:   { value: "text-amber-600",  chip: "bg-amber-50" },
  red:     { value: "text-red-600",    chip: "bg-red-50" },
  neutral: { value: "text-foreground", chip: "bg-secondary" },
};

export function StatCard({ label, value, sublabel, icon: Icon, tone = "neutral", centered = false, loading = false }) {
  const t = TONES[tone] ?? TONES.neutral;

  if (centered) {
    return (
      <Card>
        <CardContent className="pt-2 text-center">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${t.value}`}>{loading ? "—" : value}</p>
          {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          {Icon && (
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${t.chip}`}>
              <Icon className={`w-4 h-4 ${t.value}`} />
            </div>
          )}
        </div>
        <p className={`text-2xl font-bold mt-2 ${t.value}`}>{loading ? "—" : value}</p>
        {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}