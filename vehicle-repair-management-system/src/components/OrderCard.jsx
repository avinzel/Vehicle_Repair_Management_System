"use client"

import { User } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function formatCurrency(amount) {
    if (amount == null) return null;
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
}

// roleBadge: optional pill shown top-right (e.g. "Diagnostician") — used
// by the Mechanic view to show the viewer's own role on this job.
// notesPreview: optional excerpt line shown below the vehicle line —
// used by the Mechanic view to preview diagnostic notes on the card.
// footerNote: optional small text line under notesPreview — used by the
// Mechanic view for the "N parts logged · N mechanics on job" summary.
export function OrderCard({ order, isSelected = false, onClick, onMenuClick, roleBadge, notesPreview, footerNote }) {
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
            <div className="px-(--card-spacing) flex flex-col gap-2">
                <div className="flex items-start justify-between pt-2 pb-2">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{order.id}</span>
                        <StatusBadge status={order.status} />
                        {roleBadge && (
                            <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
                                {roleBadge}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-end text-xs gap-1">
                        <span className="text-muted-foreground mt-0.5">{order.formatted_date ?? order.date}</span>
                    </div>
                </div>

                <div className="flex flex-col">
                    <span className="font-medium text-base text-foreground">{order.customer}</span>
                    <span className="text-sm text-muted-foreground">
                        {order.vehicle} · {order.plate} · {order.vehicleType}
                    </span>
                </div>

                {notesPreview && (
                    <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-2.5 line-clamp-2">
                        {notesPreview}
                    </p>
                )}

                {footerNote && (
                    <p className="text-xs text-muted-foreground">{footerNote}</p>
                )}
            </div>

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