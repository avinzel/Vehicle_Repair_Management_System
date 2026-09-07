import { Badge } from '@/components/ui/badge';

// Visual styling only — every role sees the same colors for the same
// status. Role-specific actions (which button shows up next to it) stay
// local to each page/component, not here.
export const STATUS_STYLES = {
    'PENDING_DIAGNOSIS': 'bg-amber-100 text-amber-800 hover:bg-amber-100',
    'AWAITING_DIAGNOSIS': 'bg-amber-100 text-amber-800 hover:bg-amber-100',
    'PENDING_MECHANICS': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    'IN_PROGRESS': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    'PENDING_PARTS': 'bg-red-100 text-red-800 hover:bg-red-100',
    'AWAITING_PARTS': 'bg-red-100 text-red-800 hover:bg-red-100',
    'AWAITING_PAYMENT': 'bg-orange-100 text-orange-800 hover:bg-orange-100',
    'READY_FOR_RELEASE': 'bg-green-100 text-green-800 hover:bg-green-100',
    'COMPLETED': 'bg-green-100 text-green-800 hover:bg-green-100',
    'FULFILLED': 'bg-green-100 text-green-800 hover:bg-green-100',
};

export function StatusBadge({status, className = ''}){
    return (
        <Badge variant="secondary" className={`${STATUS_STYLES[status] ?? ''} ${className}`}>
            {status}    
        </Badge>
    );
}

