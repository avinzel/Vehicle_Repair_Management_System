"use client"

import { useState, useRef, useCallback, useMemo } from "react";
import { NavLink, Outlet, useOutletContext } from "react-router";

const API = "http://localhost:8000/api.php";

// One entry per tab. `end` on the index route stops "Overview" from
// matching every child path.
const TABS = [
  { label: "Overview", to: "/admin/reports", end: true },
  { label: "Pipeline", to: "/admin/reports/pipeline" },
  { label: "Parts Usage", to: "/admin/reports/parts-usage" },
  { label: "Mechanics", to: "/admin/reports/mechanics" },
];

// Layout route for /admin/reports/*. Renders the tab bar and owns a small
// per-report cache, so each tab fetches on first visit only and switching
// back is instant. Tabs read their data through hooks/useReport.
//
// Cache entry shape: { data, loading, error }
export function Reports() {
  // Pass AdminPage's outlet context (user, etc.) straight through. 
  const parentContext = useOutletContext() ?? {};

  const [reports, setReports] = useState({});
  const requested = useRef(new Set());

  const loadReport = useCallback(async (key, { force = false } = {}) => {
    if (!force && requested.current.has(key)) return;
    requested.current.add(key);

    setReports((prev) => ({
      ...prev,
      [key]: { data: prev[key]?.data ?? null, loading: true, error: null },
    }));

    try {
      const res = await fetch(`${API}?action=reports&report=${encodeURIComponent(key)}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status === "error") {
        throw new Error(json.error ?? json.message ?? `Request failed (HTTP ${res.status})`);
      }
      setReports((prev) => ({
        ...prev,
        [key]: { data: json.data ?? json, loading: false, error: null },
      }));
    } catch (err) {
      // Allow a retry on next mount / reload.
      requested.current.delete(key);
      setReports((prev) => ({
        ...prev,
        [key]: {
          data: prev[key]?.data ?? null,
          loading: false,
          error: err.message || "Failed to load report",
        },
      }));
    }
  }, []);

  const outletContext = useMemo(
    () => ({ ...parentContext, reports, loadReport }),
    [parentContext, reports, loadReport]
  );

  return (
    <div className="w-full">
      {/* Full-bleed tab bar, same sticky treatment as the filter bars on
          the Service Advisor pages (sits right under the 73px header). */}
      <div className="sticky top-[73px] z-10 bg-card -mx-6 -mt-6 border-b border-border">
        <nav aria-label="Report sections" className="flex gap-1 px-6 overflow-x-auto">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="pt-6">
        <Outlet context={outletContext} />
      </div>
    </div>
  );
}