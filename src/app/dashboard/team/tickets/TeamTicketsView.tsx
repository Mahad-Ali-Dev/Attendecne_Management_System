"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { formatDate } from "@/lib/format";
import { TicketsAgentList, type AgentTicketRow } from "@/app/admin/tickets/TicketsAgentList";

/**
 * The team lead's read-only ticket report with two sub-tabs: "By agent" (the
 * admin-style expandable per-agent list for the month) and "By date" (pick any
 * day in the month and see each agent's tickets for that day). All data is the
 * month already loaded by the page, so switching date needs no round-trip.
 */
export function TeamTicketsView({
  rows,
  monthLabel,
  monthKey,
  profileBasePath,
  monthStart,
  maxDate,
}: {
  rows: AgentTicketRow[];
  monthLabel: string;
  monthKey: string;
  profileBasePath: string;
  /** First day of the selected month (YYYY-MM-DD). */
  monthStart: string;
  /** Latest selectable day: today for the current month, else the month's last day. */
  maxDate: string;
}) {
  const [view, setView] = useState<"agent" | "date">("agent");
  const [date, setDate] = useState(maxDate);

  const tabClass = (active: boolean) =>
    `rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${
      active ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:text-navy"
    }`;

  // Each agent's count for the chosen date, busiest first.
  const dateRows = rows
    .map((r) => ({ r, count: r.days.find((d) => d.date === date)?.count ?? 0 }))
    .sort((a, b) => b.count - a.count || a.r.name.localeCompare(b.r.name));
  const dateTotal = dateRows.reduce((s, x) => s + x.count, 0);

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
        <button type="button" onClick={() => setView("agent")} className={tabClass(view === "agent")}>
          By agent
        </button>
        <button type="button" onClick={() => setView("date")} className={tabClass(view === "date")}>
          By date
        </button>
      </div>

      {view === "agent" ? (
        <TicketsAgentList
          rows={rows}
          monthLabel={monthLabel}
          monthKey={monthKey}
          editable={false}
          profileBasePath={profileBasePath}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div>
              <h3 className="font-semibold text-navy">Tickets on {formatDate(date)}</h3>
              <p className="text-xs text-slate-400">
                {dateTotal} {dateTotal === 1 ? "ticket" : "tickets"} across the team that day.
              </p>
            </div>
            <div className="w-44">
              <input
                type="date"
                aria-label="Pick a date"
                value={date}
                min={monthStart}
                max={maxDate}
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
                className="input"
              />
            </div>
          </div>
          {dateRows.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-400">No support agents on your team.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Agent</th>
                  <th className="px-6 py-3 text-right font-medium">Tickets solved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dateRows.map(({ r, count }) => (
                  <tr key={r.id} className={count ? "text-slate-700" : "text-slate-400"}>
                    <td className="px-6 py-3">
                      <Link
                        href={`${profileBasePath}/${r.id}?month=${monthKey}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <Avatar name={r.name} src={r.avatarUrl} size={30} />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-navy">{r.name}</div>
                          <div className="truncate text-xs text-slate-400">{r.position || "Support"}</div>
                        </div>
                      </Link>
                    </td>
                    <td className={`px-6 py-3 text-right tabular-nums ${count ? "font-semibold text-navy" : ""}`}>
                      {count || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-100 bg-slate-50 font-semibold text-navy">
                <tr>
                  <td className="px-6 py-3">Total</td>
                  <td className="px-6 py-3 text-right tabular-nums text-brand-600">{dateTotal}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
