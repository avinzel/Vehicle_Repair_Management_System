import { Search, ClipboardList, Wrench, FileText, Plus, PackageX } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';

// Advisor-specific: what action shows up next to each status. Badge colors
// themselves live in StatusBadge.jsx and are shared across every role.
const ORDER_ACTIONS = {
    'Pending Diagnosis': { label: 'Assign Diagnostician', icon: Search, variant: 'default', className: 'bg-amber-500 hover:bg-amber-600 text-white' },
    'Awaiting Diagnosis': { label: 'View Order', icon: null, variant: 'outline', className: 'border-amber-300 text-amber-800 hover:bg-amber-50' },
    'Pending Mechanics': { label: 'Assign Mechanics', icon: Wrench, variant: 'outline', className: 'border-blue-300 text-blue-800 hover:bg-blue-50' },
    'In Progress': { label: 'View Order', icon: null, variant: 'outline', className: 'border-blue-300 text-blue-800 hover:bg-blue-50' },
    // Advisor's nav has no Parts Inventory access (Admin-only), so this is
    // view-only here — resolved once Admin restocks the part elsewhere.
    'Pending Parts': { label: 'View Order', icon: PackageX, variant: 'outline', className: 'border-red-300 text-red-800 hover:bg-red-50' },
    'Awaiting Payment': { label: 'Collect Payment', icon: null, variant: 'default', className: 'bg-orange-600 hover:bg-orange-700 text-white' },
    'Ready for Release': { label: 'Release Vehicle', icon: null, variant: 'outline', className: 'border-green-300 text-green-800 hover:bg-green-50' },
};

const METRICS = [
    { key: 'needsDiagnostician', label: 'Needs Diagnostician', icon: Search, color: 'text-amber-600', bg: 'bg-amber-50' },
    { key: 'awaitingDiagnosis', label: 'Awaiting Diagnosis', icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50' },
    { key: 'needsMechanics', label: 'Needs Mechanics', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'pendingParts', label: 'Pending Parts', icon: PackageX, color: 'text-red-600', bg: 'bg-red-50' },
    { key: 'readyToInvoice', label: 'Ready to Invoice', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
];

function formatCurrency(amount) {
    if (amount == null) return '—';
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

export function DashboardTab({ metrics, orders = [], onNavigate }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {METRICS.map(({ key, label, icon: Icon, color, bg }) => (
                    <Card key={key}>
                        <CardContent className="pt-2">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${bg}`}>
                                <Icon className={`w-4 h-4 ${color}`} />
                            </div>
                            <p className="text-sm text-muted-foreground">{label}</p>
                            <p className={`text-2xl font-bold ${color}`}>{metrics?.[key] ?? 0}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="font-bold pb-1">Repair Orders</CardTitle>
                        <CardDescription>Recent repair orders from your shop.</CardDescription>
                    </div>
                    <Button variant="link" onClick={() => onNavigate?.('#orders')}>
                        View all →
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-sm font-medium text-tertiary">Order ID</TableHead>
                                <TableHead className="text-sm font-medium text-tertiary">Customer</TableHead>
                                <TableHead className="text-sm font-medium text-tertiary">Vehicle</TableHead>
                                <TableHead className="text-sm font-medium text-tertiary">Status</TableHead>
                                <TableHead className="text-sm font-medium text-tertiary">Amount</TableHead>
                                <TableHead className="text-right text-sm font-medium text-tertiary">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => {
                                const action = ORDER_ACTIONS[order.status];
                                const ActionIcon = action?.icon;
                                return (
                                    <TableRow key={order.orderId}>
                                        <TableCell className="font-medium">{order.orderId}</TableCell>
                                        <TableCell>{order.customer}</TableCell>
                                        <TableCell className="text-muted-foreground">{order.vehicle}</TableCell>
                                        <TableCell>
                                            <StatusBadge status={order.status} />
                                        </TableCell>
                                        <TableCell>{formatCurrency(order.amount)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant={action?.variant ?? 'outline'}
                                                className={action?.className}
                                                onClick={() => onNavigate?.(`#orders/${order.orderId}`)}
                                            >
                                                {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
                                                {action?.label ?? 'View Order'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

           {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                    className="h-full bg-primary text-primary-foreground border-0 cursor-pointer hover:bg-primary/90 transition-colors"
                    onClick={() => onNavigate?.('#intake')}
                >
                    <CardContent className="h-full p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary-foreground/20 flex items-center justify-center shrink-0">
                            <Plus className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="font-semibold">New Vehicle Intake</p>
                            <p className="text-xs opacity-90">Register a customer &amp; create repair order</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="h-full cursor-pointer hover:bg-secondary transition-colors" onClick={() => onNavigate?.('#orders')}>
                    <CardContent className="h-full p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <ClipboardList className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">Active Orders</p>
                            <p className="text-xs text-muted-foreground">Manage ongoing repair jobs</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="h-full cursor-pointer hover:bg-secondary transition-colors" onClick={() => onNavigate?.('#billing')}>
                    <CardContent className="h-full p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">Billing &amp; Invoicing</p>
                            <p className="text-xs text-muted-foreground">Process payments &amp; checkout</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}