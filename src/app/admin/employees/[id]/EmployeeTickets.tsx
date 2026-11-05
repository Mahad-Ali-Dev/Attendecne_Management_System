"use client";

import { useMemo, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { TicketsChart, type TicketChartRow } from "@/components/TicketsChart";
import { formatDate } from "@/lib/format";
import type { TicketReport } from "@/lib/types";
import { Ticket, CalendarDays, Gauge, Sigma } from "lucide-react";

/**
 * Support-ticket summary for one employee on their admin detail page: month
 * and all-time stat cards, then a graph of tickets solved per day with a tab
 * to swap in the day-by-day table — the same graph/table pattern the hours and
 * productivity sections use. Only rendered for employees flagged as support
 * agents.
 */
export function EmployeeTickets({
  monthLabel,
  monthStart,
  monthEnd,
  monthEntries,
  ticketsThisMonth,
  ticketsAllTime,
}: {
  monthLabel: string;
  /** First and last day (YYYY-MM-DD) of the selected month to chart, capped to today. */
  monthStart: string;
  monthEnd: string;
  /** This month's ticket rows, most recent first. */
  monthEntries: TicketReport[];
  ticketsThisMonth: number;
  ticketsAllTime: number;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  const daysLogged = monthEntries.length;
  const avgPerDay = daysLogged > 0 ? ticketsThisMonth / daysLogged : 0;

  // One bar per calendar day in the month (zero-filled), so the daily shape
  // reads at a glance — the table still lists only days with a real entry.
  const chartData = useMemo<TicketChartRow[]>(() => {
    const byDate = new Map(monthEntries.map((e) => [e.work_date, e.tickets_solved]));
    const rows: TicketChartRow[] = [];
    const start = Date.parse(`${monthStart}T00:00:00Z`);
    const end = Date.parse(`${monthEnd}T00:00:00Z`);
    for (let t = start; t <= end; t += 86_400_000) {
      const date = new Date(t).toISOString().slice(0, 10);
      rows.push({
        date,
        label: new Date(t).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", timeZone: "UTC" }),
        tickets: byDate.get(date) ?? 0,
      });
    }
    return rows;
  }, [monthEntries, monthStart, monthEnd]);

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-semibold transition ${
      active ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:text-navy"
    }`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-navy">Support tickets</h2>
        <p className="mt-1 text-sm text-slate-500">Tickets solved in {monthLabel}, and all time.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Ticket className="h-5 w-5" />}
          label={`Solved · ${monthLabel.split(" ")[0]}`}
          value={ticketsThisMonth}
          accent="text-brand-600"
        />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="Days logged" value={daysLogged} />
        <StatCard
          icon={<Gauge className="h-5 w-5" />}
          label="Avg / logged day"
          value={daysLogged > 0 ? avgPerDay.toFixed(1) : "—"}
        />
        <StatCard icon={<Sigma className="h-5 w-5" />} label="All time" value={ticketsAllTime} />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="font-semibold text-navy">Daily tickets</h3>
            <p className="text-xs text-slate-400">Tickets solved each day in {monthLabel}.</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            <button type="button" onClick={() => setView("chart")} className={tabClass(view === "chart")}>
              Graph
            </button>
            <button type="button" onClick={() => setView("table")} className={tabClass(view === "table")}>
              Table
            </button>
          </div>
        </div>

        {daysLogged === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">No tickets logged in {monthLabel}.</p>
        ) : view === "chart" ? (
          <div className="p-6">
            <TicketsChart data={chartData} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 text-right font-medium">Tickets solved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {monthEntries.map((e) => (
                <tr key={e.id} className="text-slate-600">
                  <td className="px-6 py-3">{formatDate(e.work_date)}</td>
                  <td className="px-6 py-3 text-right font-semibold tabular-nums text-navy">{e.tickets_solved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
