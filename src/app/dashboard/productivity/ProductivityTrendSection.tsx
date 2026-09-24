"use client";

import { useMemo, useState } from "react";
import { ProductivityChart, type ChartRow } from "@/components/ProductivityChart";
import { ProductivityTrendTable } from "./ProductivityTrendTable";
import { productivityPercent } from "@/lib/productivity";
import { formatHours } from "@/lib/format";
import type { ProductivitySession } from "@/lib/types";

type Mode = "week" | "month";

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Drives the Daily (last 7 days) / Monthly (month to date) toggle for the
 * trend chart and its table — one component so both switch together, since
 * showing a monthly chart next to a 7-day table (or vice versa) would be
 * confusing. `sessions` must already cover the full month-to-date range;
 * this only ever slices it, never re-fetches.
 */
export function ProductivityTrendSection({
  sessions,
  todayKey,
  monthLabel,
}: {
  sessions: ProductivitySession[];
  todayKey: string;
  monthLabel: string;
}) {
  const [mode, setMode] = useState<Mode>("week");
  const byDate = useMemo(() => new Map(sessions.map((s) => [s.work_date, s])), [sessions]);

  const { chartData, rangeSessions } = useMemo(() => {
    const days: string[] = [];
    if (mode === "week") {
      for (let i = 6; i >= 0; i--) {
        days.push(new Date(Date.parse(`${todayKey}T00:00:00Z`) - i * 86_400_000).toISOString().slice(0, 10));
      }
    } else {
      const monthKey = todayKey.slice(0, 7);
      const dayOfMonth = Number(todayKey.slice(8, 10));
      for (let d = 1; d <= dayOfMonth; d++) {
        days.push(`${monthKey}-${String(d).padStart(2, "0")}`);
      }
    }

    const chartData: ChartRow[] = days.map((date) => {
      const s = byDate.get(date);
      return {
        date,
        label: dayLabel(date),
        productiveHours: (s?.total_productive_seconds ?? 0) / 3600,
        unproductiveHours: (s?.total_unproductive_seconds ?? 0) / 3600,
        pct: s ? productivityPercent(s.total_productive_seconds, s.total_unproductive_seconds) : null,
        flagged: s?.flagged_suspicious ?? false,
      };
    });

    const rangeSessions = days
      .map((date) => byDate.get(date))
      .filter((s): s is ProductivitySession => !!s)
      .sort((a, b) => (a.work_date < b.work_date ? 1 : -1));

    return { chartData, rangeSessions };
  }, [byDate, mode, todayKey]);

  const totalProductive = rangeSessions.reduce((sum, s) => sum + s.total_productive_seconds, 0);
  const totalUnproductive = rangeSessions.reduce((sum, s) => sum + s.total_unproductive_seconds, 0);
  const pct = productivityPercent(totalProductive, totalUnproductive);
  const rangeNoun = mode === "week" ? "this week" : "this month";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-lg font-semibold text-navy">{mode === "week" ? "Last 7 days" : monthLabel}</h2>
          <p className="text-sm text-slate-400">
            {pct === null
              ? `No activity tracked ${rangeNoun}`
              : `${mode === "week" ? "This week" : "This month"}: ${pct}% productive · ${formatHours(
                  (totalProductive + totalUnproductive) / 3600
                )} tracked`}
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setMode("week")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              mode === "week" ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-navy"
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setMode("month")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              mode === "month" ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-navy"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="card p-6">
        <ProductivityChart data={chartData} />
      </div>

      <div className="mt-6">
        <ProductivityTrendTable sessions={rangeSessions} />
      </div>
    </div>
  );
}
