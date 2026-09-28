"use client"

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SheetClose } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/StatusBadge";
import { resolveMechanicStage, getMyPositionOnOrder } from "@/components/MechanicOrderStages";

// Two header layouts, chosen by the resolved stage's `kind`:
//  - "diagnosis": Diagnostic Log view. Title is prefixed, badge shows the
//    order STATUS (matches the advisor-facing status vocabulary), subtitle
//    is "Customer · Vehicle" — mirrors the two "Diagnostic Log · RO-####"
//    screenshots.
//  - "team": Work Orders view. Plain order id as title, badge shows the
//    viewer's own ROLE on this job, subtitle is "Vehicle · Plate".
export function MechanicOrderDetail({ order, currentUserName, onUpdateOrder, onLogParts, allowDiagnosisForm = true, onOpenDiagnosticLog }) {
  if (!order) return null;

  const { kind, Component, isUpdate } = resolveMechanicStage(order, currentUserName, { allowDiagnosisForm });
  const myPositionOnThisJob = getMyPositionOnOrder(order, currentUserName);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between p-6 border-b border-border">
        {kind === "diagnosis" ? (
          <div>
            <h2 className="text-lg font-bold">Diagnostic Log · {order.id}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {order.customer} · {order.vehicle}
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold">{order.id}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {order.vehicle} · {order.plate}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          {kind === "diagnosis" ? (
            <StatusBadge status={order.status} />
          ) : (
            myPositionOnThisJob && (
              <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
                {myPositionOnThisJob}
              </Badge>
            )
          )}
          <SheetClose className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="w-5 h-5" />
          </SheetClose>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground tracking-wide mb-3 uppercase">
            {kind === "diagnosis" ? "Vehicle Information" : "Job Details"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Customer</p>
              <p className="font-medium">{order.customer ?? "—"}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Vehicle</p>
              <p className="font-medium">{order.vehicle ?? "—"}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Plate</p>
              <p className="font-medium">{order.plate ?? "—"}</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Current Millage</p>
              <p className="font-medium">{order.currentMillage ?? "—"}</p>
            </div>
             <div className="col-span-2 bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">VIN Number</p>
              <p className="font-medium">{order.vinNumber ?? "—"}</p>
            </div>
          </div>
        </div>

        <Component
          order={order}
          onUpdateOrder={onUpdateOrder}
          currentUserName={currentUserName}
          myPositionOnThisJob={myPositionOnThisJob}
          onLogParts={onLogParts}
          onOpenDiagnosticLog={onOpenDiagnosticLog}
          isUpdate={isUpdate}
        />
      </div>
    </div>
  );
}