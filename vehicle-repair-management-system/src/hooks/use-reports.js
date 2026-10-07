// hooks/useReport.js
//
// Reads one report out of the cache owned by the Reports layout route.
// The first component to call useReport("pipeline") triggers the fetch;
// later calls (switching tabs back and forth) read the cached result.
//
//   const { data, loading, error, reload } = useReport("pipeline");
//
// Must be rendered inside <Reports /> (it reads that route's outlet context).

import { useEffect, useCallback } from "react";
import { useOutletContext } from "react-router";

export function useReport(key) {
  const ctx = useOutletContext() ?? {};
  const { reports, loadReport } = ctx;

  if (!loadReport) {
    throw new Error("useReport must be used inside the Reports layout route.");
  }

  useEffect(() => {
    loadReport(key);
  }, [key, loadReport]);

  const entry = reports?.[key];

  const reload = useCallback(() => loadReport(key, { force: true }), [key, loadReport]);

  return {
    data: entry?.data ?? null,
    // No cache entry yet means the effect hasn't fired: treat as loading so
    // tabs never flash an empty state on first paint.
    loading: entry ? entry.loading : true,
    error: entry?.error ?? null,
    reload,
  };
}