"use client";

import { useState } from "react";

/**
 * A section header with a Graph/Table toggle that shows one of two passed-in
 * views (a chart or a table). Both views are rendered by the server component
 * and handed in as nodes; this only owns which tab is active.
 */
export function ChartTableTabs({
  title,
  subtitle,
  chartLabel = "Graph",
  tableLabel = "Table",
  chart,
  table,
}: {
  title: string;
  subtitle?: string;
  chartLabel?: string;
  tableLabel?: string;
  chart: React.ReactNode;
  table: React.ReactNode;
}) {
  const [tab, setTab] = useState<"chart" | "table">("chart");

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-semibold transition ${
      active ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:text-navy"
    }`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-navy">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button type="button" onClick={() => setTab("chart")} className={tabClass(tab === "chart")}>
            {chartLabel}
          </button>
          <button type="button" onClick={() => setTab("table")} className={tabClass(tab === "table")}>
            {tableLabel}
          </button>
        </div>
      </div>
      {tab === "chart" ? chart : table}
    </div>
  );
}
