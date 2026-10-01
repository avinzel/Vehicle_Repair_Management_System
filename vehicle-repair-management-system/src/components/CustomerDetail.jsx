"use client"

import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { X, Plus, Car, Bike, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/StatusBadge";
import { normalizeCustomerDetails } from "@/utils/normalizeCustomer";

const API = "http://localhost:8000/api.php";

const VEHICLE_ICONS = { CAR: Car, MOTORCYCLE: Bike, TRICYCLE: Truck };

function Tile({ label, children, className = "" }) {
  return (
    <div className={`bg-secondary/50 rounded-lg p-3 ${className}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{children}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground tracking-wide mb-3 uppercase">
      {children}
    </h3>
  );
}

// `customer` is the normalized table row (id, name, phone, email, vehicleCount,
// lastVisit) — enough to paint the header and contact tiles immediately. The
// address, vehicles and repair history load from the detail endpoint.
export function CustomerDetail({ customer }) {
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const rawId = customer?.rawId;

  useEffect(() => {
    if (rawId == null) return;
    let cancelled = false;
    setDetails(null);
    setError(null);
    setLoading(true);

    fetch(`${API}?action=customers&customer_id=${encodeURIComponent(rawId)}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.status === "success") {
          setDetails(normalizeCustomerDetails(json.data));
        } else {
          setError(json.error ?? "Failed to load customer details");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load customer details");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rawId]);

  if (!customer) return null;

  // Hand the intake page everything it needs to pre-fill Customer Info and
  // offer this customer's existing vehicles in the Vehicle Details step.
  // Keys match the intake payload (firstName, phone, plateNumber, make, ...).
  function handleNewRepairOrder() {
    if (!details) return;
    navigate("/service-advisor/intake", {
      state: {
        intakeContext: {
          source: "customer-records",
          customer: {
            id: details.rawId,
            firstName: details.firstName,
            middleName: details.middleName,
            lastName: details.lastName,
            phone: details.phone ?? "",
            email: details.email ?? "",
            address: details.address ?? "",
          },
          vehicles: details.vehicles,
        },
      },
    });
  }

  const vehicles = details?.vehicles ?? [];
  const orders = details?.orders ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 p-6 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
            {customer.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{customer.name}</h2>
            <p className="text-sm text-muted-foreground">{customer.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            type="button"
            size="sm"
            disabled={!details}
            onClick={handleNewRepairOrder}
            className="gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            New Repair Order
          </Button>
          <SheetClose className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="w-5 h-5" />
          </SheetClose>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <SectionTitle>Contact Information</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Phone">{customer.phone ?? "—"}</Tile>
            <Tile label="Email">{customer.email ?? "—"}</Tile>
            <Tile label="Last Visit">{customer.lastVisit ?? "—"}</Tile>
            <Tile label="Total Vehicles">{customer.vehicleCount}</Tile>
            <Tile label="Address" className="col-span-2">
              {loading && !details ? (
                <span className="text-muted-foreground font-normal">Loading...</span>
              ) : (
                details?.address || "—"
              )}
            </Tile>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            {error}
          </p>
        )}

        <div>
          <SectionTitle>Registered Vehicles</SectionTitle>
          {loading && !details ? (
            <p className="text-sm text-muted-foreground">Loading vehicles...</p>
          ) : vehicles.length > 0 ? (
            <div className="space-y-2">
              {vehicles.map((v) => {
                const Icon = VEHICLE_ICONS[v.vehicleType] ?? Car;
                return (
                  <div key={v.id} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {[v.make, v.model, v.year].filter(Boolean).join(" ")}
                      </p>
                      <p className="text-xs text-muted-foreground">{v.plateNumber}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            !error && <p className="text-sm text-muted-foreground">No vehicles registered yet.</p>
          )}
        </div>

        <div>
          <SectionTitle>Repair History</SectionTitle>
          {loading && !details ? (
            <p className="text-sm text-muted-foreground">Loading repair history...</p>
          ) : orders.length > 0 ? (
            <div className="space-y-2">
              {orders.map((order) => (
                <div
                  key={order.rawId ?? order.id}
                  className="flex items-center justify-between gap-3 bg-secondary/50 rounded-lg p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{order.id}</p>
                    <p className="text-xs text-muted-foreground">{order.date}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          ) : (
            !error && <p className="text-sm text-muted-foreground">No repair orders yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}