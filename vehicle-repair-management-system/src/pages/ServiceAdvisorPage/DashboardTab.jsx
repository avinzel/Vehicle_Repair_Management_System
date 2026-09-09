import { Search, ClipboardList, Wrench, FileText, Plus, PackageX, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge, formatStatusLabel } from '@/components/StatusBadge';
import { Link, useOutletContext } from 'react-router';

// Supports both SCREAMING_SNAKE_CASE (standard DB) and Title Case formats
const ORDER_ACTIONS = {
    'PENDING_DIAGNOSIS': { label: 'Assign Diagnostician', icon: Search, variant: 'default', className: 'bg-amber-100 border-amber-300 hover:bg-amber-200 text-amber-800' },
    'Pending Diagnosis': { label: 'Assign Diagnostician', icon: Search, variant: 'default', className: 'bg-amber-100 border-amber-300 hover:bg-amber-200 text-amber-800' },
    
    'AWAITING_DIAGNOSIS': { label: 'View Order', icon: null, variant: 'default', className: 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200' },
    'Awaiting Diagnosis': { label: 'View Order', icon: null, variant: 'default', className: 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200' },
    
    'PENDING_MECHANICS': { label: 'Assign Mechanics', icon: Wrench, variant: 'default', className: 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200' },
    'Pending Mechanics': { label: 'Assign Mechanics', icon: Wrench, variant: 'default', className: 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-50' },
    
    'IN_PROGRESS': { label: 'View Order', icon: null, variant: 'default', className: 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200' },
    'In Progress': { label: 'View Order', icon: null, variant: 'default', className: 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200' },
    
    'PENDING_PARTS': { label: 'View Order', icon: PackageX, variant: 'default', className: 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200' },
    'Pending Parts': { label: 'View Order', icon: PackageX, variant: 'default', className: 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200' },
    
    'AWAITING_PAYMENT': { label: 'Collect Payment', icon: null, variant: 'default', className: 'bg-primary hover:bg-primary/70 text-white' },
    'Awaiting Payment': { label: 'Collect Payment', icon: null, variant: 'default', className: 'bg-primary hover:bg-primary/70 text-white' },
    
    'READY_FOR_RELEASE': { label: 'Release Vehicle', icon: null, variant: 'default', className: 'bg-green-100 border-green-300 text-green-800 hover:bg-green-100' },
    'Ready for Release': { label: 'Release Vehicle', icon: null, variant: 'default', className: 'bg-green-100 border-green-300 text-green-800 hover:bg-green-100' },
    
    'FULFILLED': { label: 'View Details', icon: CheckCircle, variant: 'ghost', className: 'text-gray-500 hover:bg-gray-100' },
    'Fulfilled': { label: 'View Details', icon: CheckCircle, variant: 'ghost', className: 'text-gray-500 hover:bg-gray-100' }
};

const METRICS = [
    { dbKey: 'needs_diagnostician', altKey: 'needsDiagnostician', label: 'Needs Diagnostician', icon: Search, color: 'text-amber-600', bg: 'bg-amber-50' },
    { dbKey: 'awaiting_diagnosis', altKey: 'awaitingDiagnosis', label: 'Awaiting Diagnosis', icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50' },
    { dbKey: 'needs_mechanics', altKey: 'needsMechanics', label: 'Needs Mechanics', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
    { dbKey: 'awaiting_parts', altKey: 'pendingParts', label: 'Pending Parts', icon: PackageX, color: 'text-red-600', bg: 'bg-red-50' },
    { dbKey: 'ready_to_invoice', altKey: 'readyToInvoice', label: 'Ready to Invoice', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
];

function formatCurrency(amount) {
    if (amount == null) return '—';
    return `${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}



export function DashBoardTab() {
    // 1. Hook into the parent data fetched in ServiceAdvisorPage
    const context = useOutletContext() || {};
    const tableData = context.tableData || [];
    const rawData = context.card;
    const cardData = Array.isArray(rawData) ? rawData[0] : rawData;

    return (
        <div className="space-y-6">
            {/* Top Metric Cards connected to Backend */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {METRICS.map(({ dbKey, altKey, label, icon: Icon, color, bg }) => (
                    <Card key={dbKey}>
                        <CardContent className="pt-2">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${bg}`}>
                                <Icon className={`w-4 h-4 ${color}`} />
                            </div>
                            <p className="text-sm text-muted-foreground">{label}</p>
                            <p className={`text-2xl font-bold ${color}`}>
                                {cardData?.[dbKey] ?? cardData?.[altKey] ?? 0}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recent Orders Table connected to Backend */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="font-bold pb-1">Repair Orders</CardTitle>
                        <CardDescription>Recent repair orders from your shop.</CardDescription>
                    </div>
                    <Link to="/service-advisor/orders">
                        <Button variant="link">View all →</Button>
                    </Link>
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
                            {tableData
                                .filter((order) => order.status !== "FULFILLED" && order.status !== "Fulfilled")
                                .map((order) => {
                                    const action = ORDER_ACTIONS[order.status] || ORDER_ACTIONS['PENDING_DIAGNOSIS'];
                                    const ActionIcon = action?.icon;
                                    const orderId = order.orderId ?? order.order_id;

                                    return (
                                        <TableRow key={orderId}>
                                            <TableCell className="font-medium">{orderId}</TableCell>
                                            <TableCell>{order.customer}</TableCell>
                                            <TableCell className="text-muted-foreground">{order.vehicle}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={formatStatusLabel(order.status)} />
                                            </TableCell>
                                            <TableCell>{formatCurrency(order.amount)}</TableCell>
                                            <TableCell className="text-right">
                                                {/* Routing uses standard React Router Link */}
                                                <Button
                                                    render={<Link to={`/service-advisor/orders/${orderId}`} />}
                                                    size="sm"
                                                    variant={action?.variant ?? 'outline'}
                                                    className={action?.className}
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

            {/* Quick Actions with robust linking */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link to="/service-advisor/intake" className="block h-full">
                    <Card className="h-full bg-primary text-primary-foreground border-0 cursor-pointer hover:bg-primary/90 transition-colors">
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
                </Link>

                <Link to="/service-advisor/orders" className="block h-full">
                    <Card className="h-full cursor-pointer hover:bg-secondary transition-colors">
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
                </Link>

                <Link to="/service-advisor/billing" className="block h-full">
                    <Card className="h-full cursor-pointer hover:bg-secondary transition-colors">
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
                </Link>
            </div>
        </div>
    );
}