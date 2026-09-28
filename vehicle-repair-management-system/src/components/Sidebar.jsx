import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from "react-router";
import {
    Wrench,
    LayoutDashboard,
    FilePlus,
    ClipboardList,
    Users,
    CreditCard,
    SquareText,
    Cog,
    History,
    Wrench as MechanicIcon,
    Boxes,
    BarChart3,
    MoreVertical,
    LogOut,
    X,
    Menu,
} from 'lucide-react';

import {
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton
} from '@/components/ui/sidebar';
import { useNavigate } from 'react-router';

// Nav links per role. Add/remove items here as the system's role-based
// access rules change, rather than editing the render logic below.
const ROLE_LINKS = {
    Admin: [
        { name: 'Dashboard', icon: LayoutDashboard, href: '#dashboard' },
        { name: 'Staff', icon: LayoutDashboard, href: '#staff' },
        { name: 'Mechanics', icon: MechanicIcon, href: '#mechanics' },
        { name: 'Parts Inventory', icon: Boxes, href: '#parts', badgeKey: 'lowStock' },
        { name: 'Reports', icon: BarChart3, href: '#reports' },
    ],
    'Service Advisor': [
        { name: 'Dashboard', icon: LayoutDashboard, href: '/service-advisor' },
        { name: 'New Vehicle Intake', icon: FilePlus, href: '/service-advisor/intake' },
        { name: 'Active Repair Orders', icon: ClipboardList, href: '/service-advisor/orders', badgeKey: 'activeOrders' },//dynamic number of order in the badge
        { name: 'Customer Records', icon: Users, href: '/service-advisor/customers' },
        { name: 'Billing & Invoicing', icon: CreditCard, href: '/service-advisor/billing' },
        { name: 'Repair Order History', icon: History, href: '/service-advisor/order-history' },
    ],
    Mechanic: [
        { name: 'Assigned Orders', icon: ClipboardList, href: '/mechanic', badgeKey: 'assignedOrders' },//dynamic number of order in the badge
        { name: 'Diagnostic Log', icon: SquareText, href: '/mechanic/diagnostic-log' },
        { name: 'Parts Logger', icon: Cog, href: '/mechanic/part-logger' },
    ],
};

// Roles that render a dark sidebar. The actual colors live in index.css
// under [data-role="..."] as --sidebar-* overrides, so the JSX below can
// stay role-agnostic and just reference sidebar tokens.
const DARK_SIDEBAR_ROLES = ['Mechanic'];

export function AppSidebar({
    role = 'Service Advisor',
    userName = 'Juan Dela Cruz',//name should be dynamic 
    badges = { activeOrders: 0, lowStock: 0, assignedOrders: 0 },
    setUser,
    user,
}) {

    const location = useLocation();

    console.log(location.pathname); // e.g. "/service-advisor/intake"
    let activeHref = '';

    if (location.pathname === "/service-advisor/intake") {
        console.log("Intake page is active");
    }
    switch (user["role_id"]) {
        case 1: activeHref = "/admin"
            break;
        case 2: activeHref = "/service-advisor"
            break;
        case 3: activeHref = "/mechanic"
            break;
    }
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showMenuDropdown, setShowMenuDropdown] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    const links = ROLE_LINKS[role] ?? ROLE_LINKS['Service Advisor'];
    const isDarkRole = DARK_SIDEBAR_ROLES.includes(role);
    const initials = userName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenuDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function logout() {
        const response = await fetch("http://localhost:8000/api.php?action=logout", {
            credentials: "include"
        });
        const data = await response.json();

        if (!response.ok) {
            alert(data.error);//taost notification
        } else {
            setUser(null)
            navigate("/", { replace: true });
        }
    }

    return (
        <>
            <Sidebar
                data-role={isDarkRole ? 'mechanic' : undefined}
                className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
            >
                <SidebarHeader className="p-2 border-b border-sidebar-border">
                    <div className="flex items-center gap-3 px-2 py-2">
                        <div className="bg-sidebar-primary text-sidebar-primary-foreground p-2 rounded-xl flex items-center justify-center shadow-sm">
                            <Wrench className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="font-bold text-sidebar-foreground text-base tracking-tight">Vehicle Repair MS</h1>
                            <p className="text-xs text-sidebar-foreground/60">Internal Portal</p>
                        </div>
                    </div>
                </SidebarHeader>

                <SidebarContent className="px-4 py-2">
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu className="space-y-2">
                                {links.map((link) => {
                                    const Icon = link.icon;
                                    const isActive = link.href === location.pathname;
                                    const badgeValue = link.badgeKey ? badges[link.badgeKey] : null;
                                    return (
                                        <SidebarMenuItem key={link.name}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isActive}
                                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                                    ? '!bg-sidebar-primary !text-sidebar-primary-foreground shadow-sm hover:!bg-sidebar-primary/90 hover:!text-sidebar-primary-foreground'
                                                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                                    }`}
                                            >
                                                <Link
                                                    to={link.href}
                                                    className="flex items-center justify-between w-full"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Icon className={`w-4 h-4 ${isActive ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/60'}`} />
                                                        <span>{link.name}</span>
                                                    </div>
                                                    {badgeValue != null && (
                                                        <span
                                                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isActive ? 'bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground' : 'bg-sidebar-accent text-sidebar-accent-foreground'
                                                                }`}
                                                        >
                                                            {badgeValue}
                                                        </span>
                                                    )}
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter className="p-4 border-t border-sidebar-border">
                    <div className="flex items-center justify-between px-2 relative">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                                {initials}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-semibold text-sidebar-foreground truncate">{userName}</p>
                                <p className="text-xs text-sidebar-foreground/60 truncate">{role}</p>
                            </div>
                        </div>

                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowMenuDropdown((prev) => !prev)}
                                className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
                                aria-label="User options menu"
                                aria-expanded={showMenuDropdown}
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>

                            {showMenuDropdown && (
                                <div className={`absolute bottom-full right-0 mb-2 w-40 border rounded-lg shadow-lg py-1 z-50 ${isDarkRole
                                    ? 'bg-sidebar-accent border-sidebar-border'
                                    : 'bg-card border-border'
                                    }`}>
                                    <button
                                        onClick={() => {
                                            setShowMenuDropdown(false);
                                            setShowLogoutModal(true);
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left transition-colors ${isDarkRole
                                            ? 'text-red-400 hover:bg-red-500/10'
                                            : 'text-red-600 hover:bg-red-50'
                                            }`}
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </SidebarFooter>
            </Sidebar>

            {showLogoutModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-xl p-6 w-96 shadow-xl border border-border space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-foreground">Confirm logout</h3>
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Log out of the session? Signing back in will be required to access the system.
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowLogoutModal(false);
                                    logout();
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 shadow-sm transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}