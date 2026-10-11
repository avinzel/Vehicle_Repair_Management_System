import { Banknote, FileText, Users, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { formatStatusLabel } from "@/utils/formatStatusLabel";
import { useReport } from "@/hooks/use-reports";

// Pipeline stages shown in the left card, in workflow order. Tints mirror
// the colours StatusBadge uses so a status looks the same everywhere.
const PIPELINE = [
  { status: "PENDING_DIAGNOSIS", row: "bg-amber-50 border-amber-200 text-amber-800" },
  { status: "AWAITING_DIAGNOSIS", row: "bg-amber-50 border-amber-200 text-amber-800" },
  { status: "PENDING_MECHANICS", row: "bg-sky-50 border-sky-200 text-sky-800" },
  { status: "IN_PROGRESS", row: "bg-blue-50 border-blue-200 text-blue-800" },
  { status: "AWAITING_PARTS", row: "bg-red-50 border-red-200 text-red-800" },
  { status: "READY_TO_INVOICE", row: "bg-purple-50 border-purple-200 text-purple-800" },
  { status: "AWAITING_PAYMENT", row: "bg-orange-50 border-orange-200 text-orange-800" },
  { status: "READY_FOR_RELEASE", row: "bg-green-50 border-green-200 text-green-800" },
];

function formatPeso(amount) {
  return `₱${Number(amount ?? 0).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function StatCard({ label, value, hint, icon: Icon, iconClass, valueClass }) {
  return (
    <Card>
      <CardContent className="pt-2">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className={`text-3xl font-bold mt-1 ${valueClass}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function AdminDashboardTab() {
  // Fetched straight from the report endpoints (see loadDashboard in use-reports).
  const { data: dashboard, loading, error } = useReport("dashboard");

  const countByStatus = dashboard?.pipeline ?? {};
  const activeOrders = dashboard?.activeOrders ?? 0;
  const recentOrders = dashboard?.recentOrders ?? []; // already newest first
  const lowStock = dashboard?.lowStockCount ?? 0;

  return (
    <div className="space-y-6">

      {error && (
        <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatPeso(dashboard?.totalRevenue)}
          hint={`${dashboard?.fulfilledOrders ?? 0} fulfilled order${dashboard?.fulfilledOrders === 1 ? "" : "s"}`}
          icon={Banknote}
          iconClass="bg-primary/10 text-primary"
          valueClass="text-primary"
        />
        <StatCard
          label="Active Orders"
          value={activeOrders}
          hint="currently in pipeline"
          icon={FileText}
          iconClass="bg-blue-50 text-blue-600"
          valueClass="text-blue-600"
        />
        <StatCard
          label="Active Staff"
          value={dashboard?.activeStaff ?? 0}
          hint={`of ${dashboard?.totalStaff ?? 0} total members`}
          icon={Users}
          iconClass="bg-green-50 text-green-600"
          valueClass="text-green-600"
        />
        <StatCard
          label="Low Stock Alerts"
          value={lowStock}
          hint="parts below threshold"
          icon={AlertTriangle}
          iconClass={lowStock > 0 ? "bg-red-50 text-red-600" : "bg-secondary text-muted-foreground"}
          valueClass={lowStock > 0 ? "text-red-600" : "text-muted-foreground"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-bold">Pipeline Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PIPELINE.map(({ status, row }) => (
              <div
                key={status}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${row}`}
              >
                <span>{formatStatusLabel(status)}</span>
                <span className="font-semibold">{countByStatus[status] ?? 0}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-bold">Recent Repair Orders</CardTitle>
            <CardDescription>The latest jobs across all stages.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="divide-y divide-border">
                {recentOrders.map((order) => (
                  <div
                    key={order.raw_order_id}
                    className="flex items-center gap-3 py-3 text-sm"
                  >
                    <span className="w-20 shrink-0 text-xs font-mono text-muted-foreground">
                      {order.order_id}
                    </span>
                    <span className="flex-1 min-w-0 truncate font-medium">{order.customer}</span>
                    <div className="w-36 flex justify-end">
                      <StatusBadge status={order.status} />
                    </div>
                    <span className="w-20 text-right text-muted-foreground">{order.amount != null ? formatPeso(order.amount) : "—"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">
                {loading ? "Loading orders..." : "No repair orders yet. New intakes will show up here."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}