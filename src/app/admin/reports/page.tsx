import Link from "next/link";
import { requireAdmin } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { DownloadReportButton } from "./DownloadReportButton";
import { fetchAll } from "@/lib/fetchAll";
import {
  formatMonthLabel,
  isActiveInMonth,
  monthKeyOf,
  pktNow,
  shiftMonthKey,
} from "@/lib/format";
import { leaveDatesSet } from "@/lib/payroll";
import { REPORT_COLUMNS, buildReportRow } from "@/lib/report";
import type {
  Attendance,
  LeaveRequest,
  Profile,
  ProductivitySession,
  TicketReport,
} from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

/** Groups rows by their user_id. */
function groupByUser<T extends { user_id: string }>(
  rows: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const list = map.get(r.user_id);
    if (list) list.push(r);
    else map.set(r.user_id, [r]);
  }
  return map;
}

// A `strong` column (see REPORT_COLUMNS) is drawn bold so it stands out.
const headClass = (strong?: boolean) =>
  `px-3 py-3 text-right font-medium leading-tight${strong ? " text-navy" : ""}`;
const cellClass = (strong?: boolean) =>
  `whitespace-nowrap px-3 py-3 text-right tabular-nums${strong ? " font-semibold text-navy" : ""}`;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  await requireAdmin();
  const supabase = createClient();

  const todayKey = pktNow().toISOString().slice(0, 10);
  const currentMonthKey = monthKeyOf(pktNow());
  const requested =
    searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month)
      ? searchParams.month
      : currentMonthKey;
  const monthKey = requested > currentMonthKey ? currentMonthKey : requested; // no browsing into the future

  const [year, month] = monthKey.split("-").map(Number);
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${monthKey}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`;

  // Every query pages through its results: Supabase returns at most 1000 rows
  // per request, which a month of attendance for a larger team would exceed.
  const [profiles, attendance, leaves, sessions, tickets] = await Promise.all([
    fetchAll<Profile>((from, to) =>
      supabase
        .from("profiles")
        .select("*")
        .neq("role", "ADMIN")
        .order("full_name")
        .order("id")
        .range(from, to),
    ),
    fetchAll<Attendance>((from, to) =>
      supabase
        .from("attendance")
        .select("*")
        .gte("work_date", monthStart)
        .lte("work_date", monthEnd)
        .order("id")
        .range(from, to),
    ),
    fetchAll<LeaveRequest>((from, to) =>
      supabase
        .from("leave_requests")
        .select("*")
        .eq("status", "APPROVED")
        .order("id")
        .range(from, to),
    ),
    fetchAll<ProductivitySession>((from, to) =>
      supabase
        .from("productivity_sessions")
        .select("*")
        .gte("work_date", monthStart)
        .lte("work_date", monthEnd)
        .order("id")
        .range(from, to),
    ),
    fetchAll<TicketReport>((from, to) =>
      supabase
        .from("ticket_reports")
        .select("*")
        .gte("work_date", monthStart)
        .lte("work_date", monthEnd)
        .order("id")
        .range(from, to),
    ),
  ]);

  const attendanceByUser = groupByUser(attendance);
  const leaveByUser = groupByUser(leaves);
  const sessionsByUser = groupByUser(sessions);

  // Tickets each employee solved this month, summed per person for the new
  // "Tickets solved" report column.
  const ticketsByUser = new Map<string, number>();
  for (const t of tickets) {
    ticketsByUser.set(t.user_id, (ticketsByUser.get(t.user_id) ?? 0) + t.tickets_solved);
  }

  // Someone who registered after this month ended wasn't an employee yet; and
  // someone disabled before this month began has left — both drop out, while a
  // disabled employee's leaving month and every earlier month still include
  // them, so a past month's report never silently changes once they go.
  const employees = profiles.filter(
    (e) => e.created_at.slice(0, 10) <= monthEnd && isActiveInMonth(e.disabled_at, monthKey),
  );

  const rows = employees.map((emp) =>
    buildReportRow(
      emp,
      monthKey,
      todayKey,
      attendanceByUser.get(emp.id) ?? [],
      leaveDatesSet(leaveByUser.get(emp.id) ?? []),
      sessionsByUser.get(emp.id) ?? [],
      ticketsByUser.get(emp.id) ?? 0,
    ),
  );

  const monthLabel = formatMonthLabel(monthKey);
  const prevMonthKey = shiftMonthKey(monthKey, -1);
  const nextMonthKey = shiftMonthKey(monthKey, 1);
  const nextDisabled = nextMonthKey > currentMonthKey;
  const avatarByUser = new Map(employees.map((e) => [e.id, e.avatar_url]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Monthly attendance, tracking and leave for every employee.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            <Link
              href={`/admin/reports?month=${prevMonthKey}`}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-navy"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="min-w-[9rem] text-center text-sm font-semibold text-navy">
              {monthLabel}
            </span>
            {nextDisabled ? (
              <span className="flex h-8 w-8 items-center justify-center text-slate-200">
                <ChevronRight className="h-4 w-4" />
              </span>
            ) : (
              <Link
                href={`/admin/reports?month=${nextMonthKey}`}
                aria-label="Next month"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-navy"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          {rows.length > 0 && (
            <DownloadReportButton
              rows={rows}
              monthLabel={monthLabel}
              monthKey={monthKey}
            />
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-slate-400">
          No employees for {monthLabel}.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1580px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="sticky left-0 z-10 min-w-[13rem] bg-slate-50 px-6 py-3 text-left font-medium">
                    Employee
                  </th>
                  {REPORT_COLUMNS.map((col) => (
                    <th key={col.key} className={headClass(col.strong)}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((row) => (
                  <tr key={row.id} className="text-slate-600">
                    <td className="sticky left-0 z-10 min-w-[13rem] bg-white px-6 py-3">
                      <Link
                        href={`/admin/employees/${row.id}?month=${monthKey}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <Avatar
                          name={row.name}
                          src={avatarByUser.get(row.id) ?? null}
                          size={30}
                        />
                        <div>
                          <div className="font-medium text-navy">
                            {row.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {row.department || row.position || "—"}
                          </div>
                        </div>
                      </Link>
                    </td>
                    {REPORT_COLUMNS.map((col) => (
                      <td key={col.key} className={cellClass(col.strong)}>
                        {col.value(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        Rest days are excluded throughout. Required days are the month&apos;s working days (approved leave
        included); Required hours exclude approved leave so time off doesn&apos;t lower attendance. Extra days
        are rest days the employee worked. Total days worked = Present + Extra days. Paid working days =
        Present + Extra days + Leaves. Tickets solved is this month&apos;s logged support tickets (support agents
        only). Click an employee for their full month.
      </p>
    </div>
  );
}
