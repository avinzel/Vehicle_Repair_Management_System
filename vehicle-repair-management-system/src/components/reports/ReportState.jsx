// components/reports/ReportState.jsx
//
// Wrap a tab's content so loading / error / empty are handled the same way
// everywhere:
//
//   const report = useReport("pipeline");
//   return (
//     <ReportState report={report} isEmpty={(d) => d.total === 0} emptyMessage="No orders yet.">
//       {(data) => <PipelineContent data={data} />}
//     </ReportState>
//   );
//
// On a reload with cached data, the old content stays visible (no flash).

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function Message({ children, action }) {
  return (
    <Card>
      <CardContent className="py-12 text-center space-y-3">
        <p className="text-sm text-muted-foreground">{children}</p>
        {action}
      </CardContent>
    </Card>
  );
}

export function ReportState({ report, children, isEmpty, emptyMessage = "No data to show yet." }) {
  const { data, loading, error, reload } = report;

  if (!data && loading) return <Message>Loading report...</Message>;

  if (!data && error) {
    return (
      <Message
        action={
          <Button type="button" variant="outline" size="sm" onClick={reload}>
            Try again
          </Button>
        }
      >
        <span className="text-destructive">{error}</span>
      </Message>
    );
  }

  if (!data) return null;
  if (isEmpty?.(data)) return <Message>{emptyMessage}</Message>;

  return <>{children(data)}</>;
}