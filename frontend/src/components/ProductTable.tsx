"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  initialData: any;
  page: number;
  limit: number;
};

function getMetrics() {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("perf_metrics");
  return raw ? JSON.parse(raw) : { NDVT_LOAD: [], NDVT_NAV: [], RTLT: [] };
}

function saveMetric(type: "NDVT_LOAD" | "NDVT_NAV" | "RTLT", value: number) {
  const metrics = getMetrics();
  if (!metrics) return;

  metrics[type].push(value);
  localStorage.setItem("perf_metrics", JSON.stringify(metrics));
}

function calcStats(values: number[]) {
  if (!values.length) return null;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  const variance =
    values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;

  return {
    n: values.length,
    mean: mean.toFixed(2),
    std: Math.sqrt(variance).toFixed(2),
  };
}

export default function ProductsTable({ initialData, page, limit }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navStartRef = useRef<number | null>(null);
  const hasLoggedLoadRef = useRef(false);

  const [stats, setStats] = useState<any>(null);

  const updateParams = (newPage: number, newLimit: number) => {
    navStartRef.current = performance.now();

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    params.set("limit", String(newLimit));

    router.push(`?${params.toString()}`);
  };

  const refreshStats = () => {
    const metrics = getMetrics();
    if (!metrics) return;

    setStats({
      NDVT_LOAD: calcStats(metrics.NDVT_LOAD),
      NDVT_NAV: calcStats(metrics.NDVT_NAV),
      RTLT: calcStats(metrics.RTLT),
    });
  };

  useEffect(() => {
    if (!initialData) return;

    const now = performance.now();

    /**
     * RTLT — /test → /
     */
    const start = performance.getEntriesByName("route_nav_start_p_to_home")[0];

    if (start && page === 1 && limit === 25) {
      const value = now - start.startTime;
      saveMetric("RTLT", value);
      console.log("[RTLT] /test → / rendered (ms):", value);
      performance.clearMarks("route_nav_start_p_to_home");
    }

    /**
     * NDVT_NAV — navigation in same route
     */
    if (navStartRef.current !== null && page === 1 && limit === 25) {
      const value = now - navStartRef.current;
      saveMetric("NDVT_NAV", value);
      console.log("[NDVT_NAV] Navigation → view rendered (ms):", value);
      navStartRef.current = null;
    }

    /**
     * NDVT_LOAD — cold load (SSR hydration)
     * Use a more accurate timing for React hydration
     */
    if (!hasLoggedLoadRef.current && !start && page === 1 && limit === 25) {
      const navEntry = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;

      if (navEntry) {
        // Better: measure from navigationStart to now (actual render complete)
        const value = now - navEntry.startTime;
        saveMetric("NDVT_LOAD", value);
        console.log("[NDVT_LOAD] Page load → table rendered (ms):", value);
      }

      hasLoggedLoadRef.current = true;
    }

    refreshStats();
  }, [initialData, page, limit]); // Add dependencies

  return (
    <div className="relative space-y-3">
      {/* Stats Panel */}
      {stats && (
        <div className="absolute right-0 top-0 text-xs border p-2 bg-white">
          <div className="font-semibold mb-1">Performance (ms)</div>

          {Object.entries(stats).map(([k, v]: any) =>
            v ? (
              <div key={k}>
                <strong>{k}</strong> → μ:{v.mean} σ:{v.std} (n={v.n})
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <Link href="/test" className="border px-2 py-1">
          Go to /test
        </Link>

        <button
          onClick={() => updateParams(Math.max(page - 1, 1), limit)}
          className="border px-2 py-1"
        >
          Prev
        </button>

        <button
          onClick={() => updateParams(page + 1, limit)}
          className="border px-2 py-1"
        >
          Next
        </button>

        <select
          value={limit}
          onChange={(e) => updateParams(1, Number(e.target.value))}
          className="border px-2 py-1"
        >
          {[10, 25, 50].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-1">Name</th>
            <th className="border p-1">Category</th>
            <th className="border p-1">Orders</th>
            <th className="border p-1">Rating</th>
            <th className="border p-1">Stock</th>
          </tr>
        </thead>

        <tbody>
          {initialData?.map((p: any) => (
            <tr key={p.id}>
              <td className="border p-1">{p.name}</td>
              <td className="border p-1">{p.category}</td>
              <td className="border p-1 text-center">{p.total_orders}</td>
              <td className="border p-1 text-center">
                {Number(p.avg_rating).toFixed(1)}
              </td>
              <td className="border p-1 text-center">{p.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
