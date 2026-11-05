import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/StatusBadge";
import { MonthlyHoursChart } from "@/components/MonthlyHoursChart";
import { MonthlyReportCard } from "@/components/MonthlyReportCard";
import { ProductivityChart, type ChartRow } from "@/components/ProductivityChart";
import { ChartTableTabs } from "@/components/ChartTableTabs";
import { EmployeeTickets } from "@/app/admin/employees/[id]/EmployeeTickets";
import { fetchAll } from "@/lib/fetchAll";
import { buildAttendanceHistory, buildMonthDayHours } from "@/lib/hours";
import { leaveDatesSet } from "@/lib/payroll";
import { buildReportRow } from "@/lib/report";
import { productivityPercent } from "@/lib/productivity";
import {
  formatDate,
  formatHours,
  formatMonthLabel,
  formatOffDays,
  formatTime,
  formatTimeOfDay,
  hoursBetween,
  monthKeyOf,
  pktNow,
  shiftLengthHours,
  shiftMonthKey,
} from "@/lib/format";
import type { Attendance, LeaveRequest, Profile, ProductivitySession, TicketReport } from "@/lib/types";
import {
  ArrowLeft,
  Mail,
  Phone,
  Clock,
  CalendarOff,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

const LEAVE_STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
};

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export default async function TeamMemberDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { month?: string };
}) {
  const lead = await getCurrentProfile();
  if (lead.role !== "TEAM_LEAD") redirect("/dashboard");
  const supabase = createClient();

  const today = pktNow();
  const todayKey = today.toISOString().slice(0, 10);
  const currentMonthKey = monthKeyOf(today);
  const requested =
    searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month) ? searchParams.month : currentMonthKey;
  const monthKey = requested > currentMonthKey ? currentMonthKey : requested;
  const [year, month] = monthKey.split("-").map(Number);
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${monthKey}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`;
  const historyEnd = monthEnd > todayKey ? todayKey : monthEnd;

  const [{ data: memberData }, { data: attData }, { data: leaveData }, { data: sessData }, ticketRows] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", params.id).single(),
      supabase
        .from("attendance")
        .select("*")
        .eq("user_id", params.id)
        .gte("work_date", monthStart)
        .lte("work_date", monthEnd),
      supabase.from("leave_requests").select("*").eq("user_id", params.id).order("start_date", { ascending: false }),
      supabase
        .from("productivity_sessions")
        .select("*")
        .eq("user_id", params.id)
        .gte("work_date", monthStart)
        .lte("work_date", monthEnd),
      fetchAll<TicketReport>((f, t) =>
        supabase
          .from("ticket_reports")
          .select("*")
          .eq("user_id", params.id)
          .order("work_date", { ascending: false })
          .order("id")
          .range(f, t)
      ),
    ]);

  // RLS already limits readable profiles to this lead's team; the explicit
  // check keeps the lead from opening anyone who isn't actually their member.
  if (!memberData || memberData.team_lead_id !== lead.id) notFound();
  const member = {
    ...memberData,
    off_days: memberData.off_days ?? [0, 6],
    is_support: memberData.is_support ?? false,
  } as Profile;

  const attendance = (attData ?? []) as Attendance[];
  const leaveRequests = (leaveData ?? []) as LeaveRequest[];
  const sessions = (sessData ?? []) as ProductivitySession[];
  const approvedLeaveDates = leaveDatesSet(leaveRequests);
  // Leave that touches the selected month, matching the attendance/productivity scope.
  const monthLeaveRequests = leaveRequests.filter(
    (lr) => lr.start_date <= monthEnd && lr.end_date >= monthStart
  );
  const shiftHours = shiftLengthHours(member.shift_start, member.shift_end);

  const reportRow = buildReportRow(member, monthKey, todayKey, attendance, approvedLeaveDates, sessions);
  const hoursDays = buildMonthDayHours(attendance, monthKey, shiftHours, todayKey, approvedLeaveDates, member.off_days);
  const attendanceHistory = buildAttendanceHistory(
    attendance,
    approvedLeaveDates,
    member.off_days,
    monthStart,
    historyEnd
  );

  // One bar per day of the month for the productivity graph (zero-filled).
  const sessionByDate = new Map(sessions.map((s) => [s.work_date, s]));
  const prodChart: ChartRow[] = [];
  for (let t = Date.parse(`${monthStart}T00:00:00Z`); t <= Date.parse(`${historyEnd}T00:00:00Z`); t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10);
    const s = sessionByDate.get(date);
    prodChart.push({
      date,
      label: new Date(t).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", timeZone: "UTC" }),
      productiveHours: (s?.total_productive_seconds ?? 0) / 3600,
      unproductiveHours: (s?.total_unproductive_seconds ?? 0) / 3600,
      pct: s ? productivityPercent(s.total_productive_seconds, s.total_unproductive_seconds) : null,
      flagged: s?.flagged_suspicious ?? false,
    });
  }

  const monthTicketRows = ticketRows.filter((r) => r.work_date.slice(0, 7) === monthKey);
  const ticketsThisMonth = monthTicketRows.reduce((sum, r) => sum + r.tickets_solved, 0);
  const ticketsAllTime = ticketRows.reduce((sum, r) => sum + r.tickets_solved, 0);

  const monthLabel = formatMonthLabel(monthKey);
  const prevMonthKey = shiftMonthKey(monthKey, -1);
  const nextMonthKey = shiftMonthKey(monthKey, 1);
  const nextDisabled = nextMonthKey > currentMonthKey;
  const monthHref = (m: string) => `/dashboard/team/${member.id}?month=${m}`;

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/team?month=${monthKey}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Back to my team
      </Link>

      {/* Monthly review header + month selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-navy">Monthly review</h2>
          <p className="mt-1 text-sm text-slate-500">
            {monthLabel} · {formatHours(shiftHours)} shift, off {formatOffDays(member.off_days)}.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <Link
            href={monthHref(prevMonthKey)}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-navy"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[9rem] text-center text-sm font-semibold text-navy">{monthLabel}</span>
          {nextDisabled ? (
            <span className="flex h-8 w-8 items-center justify-center text-slate-200">
              <ChevronRight className="h-4 w-4" />
            </span>
          ) : (
            <Link
              href={monthHref(nextMonthKey)}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-navy"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Monthly report (≈60%) beside the member detail card (≈40%). The detail
          card comes first in the DOM so it leads on a phone, and moves right on
          wide screens. */}
      <div className="grid items-start gap-6 lg:grid-cols-5">
        {/* Detail card (read-only) */}
        <div className="lg:order-2 lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <Avatar name={member.full_name} src={member.avatar_url} size={64} />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold leading-tight text-navy">{member.full_name}</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  {member.position || "Employee"}
                  {member.department ? ` · ${member.department}` : ""}
                </p>
              </div>
            </div>
            {member.is_support && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="badge bg-sky-50 text-sky-700">Support agent</span>
              </div>
            )}
            <dl className="mt-5 space-y-4 border-t border-slate-50 pt-5 text-sm">
              <Row icon={<Mail className="h-4 w-4" />} label="Email" value={member.email} />
              <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={member.phone} />
              <Row icon={<Building2 className="h-4 w-4" />} label="Department" value={member.department} />
              <Row icon={<Briefcase className="h-4 w-4" />} label="Position" value={member.position} />
              <Row
                icon={<Clock className="h-4 w-4" />}
                label="Shift"
                value={`${formatTimeOfDay(member.shift_start)} – ${formatTimeOfDay(member.shift_end)}`}
              />
              <Row icon={<CalendarOff className="h-4 w-4" />} label="Rest days" value={formatOffDays(member.off_days)} />
            </dl>
          </div>
        </div>

        {/* Monthly report */}
        <div className="lg:order-1 lg:col-span-3">
          <MonthlyReportCard row={reportRow} />
        </div>
      </div>

      {/* Daily hours: graph by default, read-only attendance table one tab away */}
      <ChartTableTabs
        title="Daily hours"
        subtitle={`Hours worked each day against the ${formatHours(
          shiftHours
        )} target. Switch to the table for day-by-day attendance.`}
        tableLabel="Attendance table"
        chart={
          <div className="card p-6">
            {hoursDays.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">No working days in this month.</p>
            ) : (
              <MonthlyHoursChart data={hoursDays} targetHours={shiftHours} />
            )}
          </div>
        }
        table={
          <div className="card overflow-hidden">
            {attendanceHistory.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-400">No attendance recorded this month.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">In</th>
                    <th className="px-6 py-3 font-medium">Out</th>
                    <th className="px-6 py-3 font-medium">Hours</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {attendanceHistory.map((entry) => {
                    const r = entry.record;
                    const status = entry.isOnLeave
                      ? "ON_LEAVE"
                      : r
                        ? r.status
                        : entry.isRestDay
                          ? "REST_DAY"
                          : "ABSENT";
                    return (
                      <tr key={entry.date} className={`text-slate-600 ${entry.isOnLeave ? "bg-blue-50" : ""}`}>
                        <td className="px-6 py-3 font-medium text-navy">
                          {formatDate(entry.date)}
                          {entry.isRestDay && !entry.isOnLeave && (
                            <span className="ml-2 text-xs font-normal text-violet-500">Weekend</span>
                          )}
                        </td>
                        <td className="px-6 py-3">{entry.isOnLeave ? "—" : formatTime(r?.check_in ?? null)}</td>
                        <td className="px-6 py-3">{entry.isOnLeave ? "—" : formatTime(r?.check_out ?? null)}</td>
                        <td className="px-6 py-3">
                          {entry.isOnLeave ? "—" : hoursBetween(r?.check_in ?? null, r?.check_out ?? null)}
                        </td>
                        <td className="px-6 py-3">
                          <StatusBadge status={status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        }
      />

      {/* Productivity: graph by default, the tracked-time table one tab away */}
      <ChartTableTabs
        title="Productivity"
        subtitle="Productive vs unproductive time the tracker recorded each day."
        chart={
          <div className="card p-6">
            {prodChart.some((r) => r.productiveHours > 0 || r.unproductiveHours > 0) ? (
              <ProductivityChart data={prodChart} />
            ) : (
              <p className="py-10 text-center text-sm text-slate-400">No activity tracked this month.</p>
            )}
          </div>
        }
        table={
          <div className="card overflow-hidden">
            {sessions.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-400">No activity tracked this month.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Total</th>
                    <th className="px-6 py-3 font-medium">Productive</th>
                    <th className="px-6 py-3 font-medium">Unproductive</th>
                    <th className="px-6 py-3 font-medium">Productivity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sessions.map((s) => {
                    const pct = productivityPercent(s.total_productive_seconds, s.total_unproductive_seconds);
                    return (
                      <tr key={s.id} className="text-slate-600">
                        <td className="px-6 py-3 font-medium text-navy">{formatDate(s.work_date)}</td>
                        <td className="px-6 py-3 font-medium text-navy">
                          {formatHours((s.total_productive_seconds + s.total_unproductive_seconds) / 3600)}
                        </td>
                        <td className="px-6 py-3 text-emerald-600">{formatHours(s.total_productive_seconds / 3600)}</td>
                        <td className="px-6 py-3 text-amber-600">{formatHours(s.total_unproductive_seconds / 3600)}</td>
                        <td className="px-6 py-3 font-medium text-navy">{pct === null ? "—" : `${pct}%`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        }
      />

      {/* Leave (read-only) */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="font-semibold text-navy">Leave</h3>
          <p className="text-xs text-slate-400">Requests in {monthLabel}.</p>
        </div>
        {monthLeaveRequests.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">No leave requests in {monthLabel}.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-6 py-3 font-medium">Dates</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {monthLeaveRequests.map((lr) => (
                <tr key={lr.id} className="text-slate-600">
                  <td className="px-6 py-3 font-medium text-navy">
                    {formatDate(lr.start_date)}
                    {lr.end_date !== lr.start_date ? ` – ${formatDate(lr.end_date)}` : ""}
                  </td>
                  <td className="px-6 py-3">{titleCase(lr.leave_type)}</td>
                  <td className="px-6 py-3">
                    <span className={`badge ${LEAVE_STATUS_CLASS[lr.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {titleCase(lr.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {member.is_support && (
        <EmployeeTickets
          monthLabel={monthLabel}
          monthStart={monthStart}
          monthEnd={historyEnd}
          monthEntries={monthTicketRows}
          ticketsThisMonth={ticketsThisMonth}
          ticketsAllTime={ticketsAllTime}
        />
      )}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="break-words text-slate-700">{value || "—"}</dd>
      </div>
    </div>
  );
}
