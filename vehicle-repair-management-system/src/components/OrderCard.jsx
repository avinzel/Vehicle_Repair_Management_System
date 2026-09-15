"use client"

import { MoreHorizontal, User } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import {
    Card,
    CardHeader,
    CardContent,
    CardFooter
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function formatCurrency(amount) {
    if (amount == null) return null;
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

export function OrderCard({ order, isSelected = false, onClick, onMenuClick }) {
    const amountLabel = formatCurrency(order.amount);
    const mechanics = order.mechanics ?? [];

    return (
        <Card
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick?.();
                }
            }}
            className={`cursor-pointer transition-colors ${
                isSelected
                    ? "border-primary ring-1 ring-primary"
                    : "hover:ring-primary/40"
            }`}
        >
            {/* GROUP 1: Header & Customer Info (Grouped to stay tight) */}
            <div className="px-(--card-spacing) flex flex-col gap-2">
                
                {/* Top Row: ID, Badge, Actions, Date */}
                <div className="flex items-start justify-between pt-2 pb-2">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{order.id}</span>
                        <StatusBadge status={order.status} />
                    </div>
                    <div className="flex flex-col items-end text-xs">
                        <span className="text-muted-foreground mt-0.5">{order.formatted_date ?? order.date}</span>
                    </div>
                </div>

                {/* Customer & Vehicle Info */}
                <div className="flex flex-col">
                    <span className="font-medium text-base text-foreground">{order.customer}</span>
                    <span className="text-sm text-muted-foreground">
                        {order.vehicle} · {order.plate} · {order.vehicleType}
                    </span>
                </div>
            </div>

            {/* GROUP 2: Separator & Mechanics Footer */}
            {mechanics.length > 0 && (
                <div className="px-(--card-spacing) flex flex-col gap-2.5">
                    <Separator />
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{mechanics.join(", ")}</span>
                    </div>
                </div>
            )}
        </Card>
    );
}