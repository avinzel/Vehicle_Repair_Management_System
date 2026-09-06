import { Badge } from '@/components/ui/badge';

// Visual styling only — every role sees the same colors for the same
// status. Role-specific actions (which button shows up next to it) stay
// local to each page/component, not here.
export const STATUS_STYLES = {
    'Pending Diagnosis': 'bg-amber-100 text-amber-800 hover:bg-amber-100',
    'Awaiting Diagnosis': 'bg-amber-100 text-amber-800 hover:bg-amber-100',
    'Pending Mechanics': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    'In Progress': 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    'Pending Parts': 'bg-red-100 text-red-800 hover:bg-red-100',
    'Awaiting Payment': 'bg-orange-100 text-orange-800 hover:bg-orange-100',
    'Ready for Release': 'bg-green-100 text-green-800 hover:bg-green-100',
    'Completed': 'bg-green-100 text-green-800 hover:bg-green-100',
    'Fulfilled': 'bg-green-100 text-green-800 hover:bg-green-100',
} 

export function StatusBadge({status, className = ''}){
    return (
        <Badge variant="secondary" className={`${STATUS_STYLE[status] ?? ''} ${className}`}>
            {status}    
        </Badge>
    );
}

