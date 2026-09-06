import { Menu } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function Header({ title, subtitle, actions }) {
    return (
        <header className="flex items-center gap-3 border-b border-border px-6 py-3 bg-background">
            <SidebarTrigger>
                <button className="p-1.5 rounded-lg hover:bg-secondary shrink-0" aria-label="Toggle sidebar">
                    <Menu className="w-4 h-4" />
                </button>
            </SidebarTrigger>
            <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
            </div>
            {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </header>
    );
}