"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

type Props = {
  initialData: any;
  page: number;
  limit: number;
};

export default function ProductsTable({ initialData, page, limit }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Measures SPA navigation timing
  const navStartRef = useRef<number | null>(null);

  // Used to avoid double logging on first render
  const hasLoggedLoadRef = useRef(false);

  const updateParams = (newPage: number, newLimit: number) => {
    navStartRef.current = performance.now(); // SPA navigation start

    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    params.set("limit", String(newLimit));

    router.push(`?${params.toString()}`);
  };

  useEffect(() => {
    if (!initialData) return;

    const now = performance.now();

    /**
     * -----------------------------
     * NDVT_NAV (SPA navigation)
     * -----------------------------
     */
    if (navStartRef.current !== null) {
      const ndvtNav = now - navStartRef.current;

      console.log("[NDVT_NAV] SPA navigation → table rendered (ms):", ndvtNav);

      // Reset so reloads don't reuse this
      navStartRef.current = null;
    }

    /**
     * -----------------------------
     * NDVT_LOAD (cold load / reload)
     * -----------------------------
     */
    if (!hasLoggedLoadRef.current) {
      const navEntry = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming | undefined;

      if (navEntry) {
        const ndvtLoad =
          navEntry.domContentLoadedEventEnd - navEntry.startTime;

        console.log("[NDVT_LOAD] Page load → table rendered (ms):", ndvtLoad);
      }

      hasLoggedLoadRef.current = true;
    }
  }, [initialData]);

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex gap-2">
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
