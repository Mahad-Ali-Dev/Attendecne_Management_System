"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { StatusBadge, type ExtendedStatus } from "@/components/StatusBadge";
import { formatHours, formatTime } from "@/lib/format";

export interface TeamRow {
  id: string;
  name: string;
  avatarUrl: string | null;
  position: string | null;
  isSupport: boolean;
  trackerOff: boolean;
  lowProductivity: boolean;
  todayStatus: ExtendedStatus;
  // Today
  todayCheckIn: string | null;
  todayCheckOut: string | null;
  todayTrackedHours: number;
  todayProductiveHours: number;
  todayUnproductiveHours: number;
  todayTickets: number;
  // This month
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  completedHours: number;
  requiredHours: number;
  monthTrackedHours: number;
  monthProductiveHours: number;
  monthUnproductiveHours: number;
  monthTickets: number;
}

const th = "px-4 py-3 text-right font-medium";
const td = "whitespace-nowrap px-4 py-3 text-right tabular-nums";

/**
 * The team roster with two views the lead can switch between: "Today" (live,
 * per-member attendance, check-in/out and today's tracked time + tickets) and
 * the selected month's totals. Today ignores the month selector — it's always
 * the current day.
 */
export function TeamMembersTable({
  rows,
  monthLabel,
  monthKey,
  anySupport,
  lowProductivityPct,
}: {
  rows: TeamRow[];
  monthLabel: string;
  monthKey: string;
  anySupport: boolean;
  lowProductivityPct: number;
}) {
  const [view, setView] = useState<"today" | "month">("today");
  const monthShort = monthLabel.split(" ")[0];

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-semibold transition ${
      active ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:text-navy"
    }`;

  function memberCell(r: TeamRow, tint: string) {
    return (
      <td className={`sticky left-0 z-10 min-w-[13rem] px-6 py-3 ${tint || "bg-white"}`}>
        <Link
          href={`/dashboard/team/${r.id}?month=${monthKey}`}
          className="flex items-center gap-3 hover:underline"
        >
          <Avatar name={r.name} src={r.avatarUrl} size={30} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-navy">{r.name}</span>
              {r.trackerOff ? (
                <span className="badge shrink-0 bg-red-100 text-red-700">Tracker off</span>
              ) : r.lowProductivity ? (
                <span className="badge shrink-0 bg-amber-100 text-amber-700">Low</span>
              ) : null}
            </div>
            <div className="truncate text-xs text-slate-400">
              {r.position || "Employee"}
              {r.isSupport ? " · Support" : ""}
            </div>
          </div>
        </Link>
      </td>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <h3 className="font-semibold text-navy">{view === "today" ? "Today" : monthLabel}</h3>
          <p className="text-xs text-slate-400">
            {view === "today"
              ? "Live — today only, whatever month is picked above."
              : `Attendance, hours and tracking totals for ${monthLabel}.`}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button type="button" onClick={() => setView("today")} className={tabClass(view === "today")}>
            Today
          </button>
          <button type="button" onClick={() => setView("month")} className={tabClass(view === "month")}>
            {monthShort}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {view === "today" ? (
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="sticky left-0 z-10 min-w-[13rem] bg-slate-50 px-6 py-3 text-left font-medium">
                  Member
                </th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className={th}>Check in</th>
                <th className={th}>Check out</th>
                <th className={th}>Tracked</th>
                <th className={th}>Productive</th>
                <th className={th}>Unproductive</th>
                {anySupport && <th className={th}>Tickets</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r) => {
                const tint = r.trackerOff ? "bg-red-50" : r.lowProductivity ? "bg-amber-50" : "";
                const tracked = r.todayTrackedHours > 0;
                return (
                  <tr key={r.id} className={`text-slate-600 ${tint}`}>
                    {memberCell(r, tint)}
                    <td className="px-4 py-3">
                      <StatusBadge status={r.todayStatus} />
                    </td>
                    <td className={td}>{formatTime(r.todayCheckIn)}</td>
                    <td className={td}>{formatTime(r.todayCheckOut)}</td>
                    <td className={td}>{tracked ? formatHours(r.todayTrackedHours) : <span className="text-slate-300">—</span>}</td>
                    <td className={`${td} ${tracked ? "text-emerald-600" : ""}`}>
                      {tracked ? formatHours(r.todayProductiveHours) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={`${td} ${tracked ? "text-amber-600" : ""}`}>
                      {tracked ? formatHours(r.todayUnproductiveHours) : <span className="text-slate-300">—</span>}
                    </td>
                    {anySupport && (
                      <td className={td}>
                        {r.isSupport ? r.todayTickets : <span className="text-slate-300">—</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="sticky left-0 z-10 min-w-[13rem] bg-slate-50 px-6 py-3 text-left font-medium">
                  Member
                </th>
                <th className={th}>Present</th>
                <th className={th}>Absent</th>
                <th className={th}>Leave</th>
                <th className={th}>Hours ({monthShort})</th>
                <th className={th}>Tracked</th>
                <th className={th}>Productive</th>
                <th className={th}>Unproductive</th>
                {anySupport && <th className={th}>Tickets</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r) => {
                const tint = r.trackerOff ? "bg-red-50" : r.lowProductivity ? "bg-amber-50" : "";
                return (
                  <tr key={r.id} className={`text-slate-600 ${tint}`}>
                    {memberCell(r, tint)}
                    <td className={td}>{r.presentDays}</td>
                    <td className={td}>{r.absentDays}</td>
                    <td className={td}>{r.leaveDays}</td>
                    <td className={td}>
                      <span className="font-semibold text-navy">{formatHours(r.completedHours)}</span>
                      <span className="text-slate-400"> / {formatHours(r.requiredHours)}</span>
                    </td>
                    <td className={td}>{formatHours(r.monthTrackedHours)}</td>
                    <td className={`${td} text-emerald-600`}>{formatHours(r.monthProductiveHours)}</td>
                    <td className={`${td} text-amber-600`}>{formatHours(r.monthUnproductiveHours)}</td>
                    {anySupport && (
                      <td className={td}>
                        {r.isSupport ? r.monthTickets : <span className="text-slate-300">—</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="border-t border-slate-100 px-6 py-3 text-center text-xs text-slate-400">
        {view === "today"
          ? "Today's attendance and tracked time, live. "
          : `Totals for ${monthLabel}; Hours shows worked / expected. `}
        Amber row = month productivity under {lowProductivityPct}%; red row = tracker off during an active shift.
        Salary isn&apos;t shown here.
      </p>
    </div>
  );
}
