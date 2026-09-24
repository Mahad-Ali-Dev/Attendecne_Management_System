"use client";

import { useMemo, useState } from "react";
import { ProductivityChart, type ChartRow } from "@/components/ProductivityChart";
import { SiteBreakdownModal } from "@/components/SiteBreakdownModal";
import { productivityPercent } from "@/lib/productivity";
import { formatDate, formatHours } from "@/lib/format";
import type { ProductivitySession, SiteActivity } from "@/lib/types";
import { AlertTriangle } from "lucide-react";

export function EmployeeProductivity({
  sessions,
  sites,
  monthStart,
  monthEnd,
}: {
  sessions: ProductivitySession[];
  sites: SiteActivity[];
  monthStart: string;
  monthEnd: string;
}) {
  const [viewingDate, setViewingDate] = useState<string | null>(null);
  const sitesForViewing = viewingDate ? sites.filter((s) => s.work_date === viewingDate) : [];

  // One bar per calendar day in the selected month (zero-filled), so the
  // admin sees the daily shape at a glance — the table below still only
  // lists days with a real session, for exact figures.
  const chartData = useMemo<ChartRow[]>(() => {
    const byDate = new Map(sessions.map((s) => [s.work_date, s]));
    const rows: ChartRow[] = [];
    const start = Date.parse(`${monthStart}T00:00:00Z`);
    const end = Date.parse(`${monthEnd}T00:00:00Z`);
    for (let t = start; t <= end; t += 86_400_000) {
      const date = new Date(t).toISOString().slice(0, 10);
      const s = byDate.get(date);
      rows.push({
        date,
        label: new Date(t).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", timeZone: "UTC" }),
        productiveHours: (s?.total_productive_seconds ?? 0) / 3600,
        unproductiveHours: (s?.total_unproductive_seconds ?? 0) / 3600,
        pct: s ? productivityPercent(s.total_productive_seconds, s.total_unproductive_seconds) : null,
        flagged: s?.flagged_suspicious ?? false,
      });
    }
    return rows;
  }, [sessions, monthStart, monthEnd]);

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="font-semibold text-navy">Productivity</h2>
        <p className="text-xs text-slate-400">Browser activity tracked for the month selected above.</p>
      </div>

      {chartData.length > 0 && (
        <div className="border-b border-slate-100 p-6">
          <ProductivityChart data={chartData} />
        </div>
      )}

      {sessions.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-slate-400">No activity tracked this month.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Total tracked</th>
              <th className="px-6 py-3 font-medium">Productive</th>
              <th className="px-6 py-3 font-medium">Unproductive</th>
              <th className="px-6 py-3 font-medium">Productivity</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sessions.map((s) => {
              const pct = productivityPercent(s.total_productive_seconds, s.total_unproductive_seconds);
              return (
                <tr
                  key={s.id}
                  onClick={() => setViewingDate(s.work_date)}
                  className="cursor-pointer text-slate-600 hover:bg-slate-50"
                >
                  <td className="px-6 py-3 font-medium text-navy">{formatDate(s.work_date)}</td>
                  <td className="px-6 py-3 font-medium text-navy">
                    {formatHours((s.total_productive_seconds + s.total_unproductive_seconds) / 3600)}
                  </td>
                  <td className="px-6 py-3 text-emerald-600">{formatHours(s.total_productive_seconds / 3600)}</td>
                  <td className="px-6 py-3 text-amber-600">{formatHours(s.total_unproductive_seconds / 3600)}</td>
                  <td className="px-6 py-3 font-medium text-navy">{pct === null ? "—" : `${pct}%`}</td>
                  <td className="px-6 py-3">
                    {s.flagged_suspicious ? (
                      <span className="badge bg-red-50 text-red-700">
                        <AlertTriangle className="h-3 w-3" /> Flagged
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {viewingDate && (
        <SiteBreakdownModal
          title={`Sites — ${formatDate(viewingDate)}`}
          sites={sitesForViewing}
          onClose={() => setViewingDate(null)}
        />
      )}
    </div>
  );
}
