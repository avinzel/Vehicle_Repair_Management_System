// components/reports/ReportCard.jsx
//
// The panel every report section sits in: title, optional description,
// optional right-aligned action, then content.

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function ReportCard({ title, description, action, children, className = "", contentClassName = "" }) {
  return (
    <Card className={className}>
      {(title || action) && (
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <CardTitle className="font-bold">{title}</CardTitle>}
            {description && <CardDescription className="pt-1">{description}</CardDescription>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </CardHeader>
      )}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}