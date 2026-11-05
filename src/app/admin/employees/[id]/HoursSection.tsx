"use client";

import { useState } from "react";

/**
 * The daily-hours area: a graph by default, with a tab that swaps in the full
 * day-by-day attendance table. Both views are passed in from the server
 * component (the chart and the AttendanceEditor), this only owns which one is
 * showing.
 */
export function HoursSection({
  subtitle,
  chart,
  table,
}: {
  subtitle: string;
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
          <h3 className="text-lg font-semibold text-navy">Daily hours</h3>
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button type="button" onClick={() => setTab("chart")} className={tabClass(tab === "chart")}>
            Graph
          </button>
          <button type="button" onClick={() => setTab("table")} className={tabClass(tab === "table")}>
            Attendance table
          </button>
        </div>
      </div>
      {tab === "chart" ? chart : table}
    </div>
  );
}
