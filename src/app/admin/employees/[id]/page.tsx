import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { MonthlyHoursChart } from "@/components/MonthlyHoursChart";
import { MonthlyReportCard } from "@/components/MonthlyReportCard";
import { DeviceMappingForm } from "./DeviceMappingForm";
import { ShiftEditForm } from "./ShiftEditForm";
import { OffDaysEditForm } from "./OffDaysEditForm";
import { DisableEmployeeControl } from "./DisableEmployeeControl";
import { SupportAgentToggle } from "./SupportAgentToggle";
import { TeamLeadToggle } from "./TeamLeadToggle";
import { TeamMembersManager, type TeamPerson } from "./TeamMembersManager";
import { AttendanceEditor } from "./AttendanceEditor";
import { SalarySlipEditor } from "./SalarySlipEditor";
import { EmployeeLeaveHistory } from "./EmployeeLeaveHistory";
import { EmployeeProductivity } from "./EmployeeProductivity";
import { EmployeeTickets } from "./EmployeeTickets";
import { HoursSection } from "./HoursSection";
import { buildAttendanceHistory, buildMonthDayHours } from "@/lib/hours";
import { leaveDatesSet } from "@/lib/payroll";
import { requiredProductiveHours } from "@/lib/productivity";
import { buildReportRow } from "@/lib/report";
import { fetchAll } from "@/lib/fetchAll";
import {
  formatDate,
  formatHours,
  formatMonthLabel,
  formatOffDays,
  formatTimeOfDay,
  monthKeyOf,
  pktNow,
  shiftLengthHours,
  shiftMonthKey,
} from "@/lib/format";
import type {
  AppActivity,
  Attendance,
  LeaveRequest,
  Profile,
  ProductivitySession,
  SalarySlip,
  TicketReport,
} from "@/lib/types";
import {
  ArrowLeft,
  IdCard,
  Phone,
  MapPin,
  Building2,
  Mail,
  Briefcase,
  Clock,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmployeeDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { month?: string };
}) {
  const supabase = createClient();

  const salaryLookback = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);

  const today = pktNow();
  const todayKey = today.toISOString().slice(0, 10);
  const currentMonthKey = monthKeyOf(today);
  const requestedMonth =
    searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month) ? searchParams.month : currentMonthKey;
  const monthKey = requestedMonth > currentMonthKey ? currentMonthKey : requestedMonth; // no browsing into the future
  const [hoursYear, hoursMonth] = monthKey.split("-").map(Number);
  const daysInHoursMonth = new Date(Date.UTC(hoursYear, hoursMonth, 0)).getUTCDate();
  const hoursMonthStart = `${monthKey}-01`;
  const hoursMonthEnd = `${monthKey}-${String(daysInHoursMonth).padStart(2, "0")}`;
  // Don't walk the attendance history into days that haven't happened yet
  // when the selected month is still in progress.
  const historyEnd = hoursMonthEnd > todayKey ? todayKey : hoursMonthEnd;

  const [
    { data: profileData },
    { data: slipData },
    { data: salaryAttData },
    { data: leaveData },
    { data: hoursAttData },
    { data: sessionsData },
    { data: appsData },
    ticketRows,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", params.id).single(),
    supabase
      .from("salary_slips")
      .select("*")
      .eq("user_id", params.id)
      .order("month", { ascending: false }),
    // Wider window (not just the last 30 records) so the salary editor can
    // compute accurate hours-worked-vs-expected for whichever month it's editing.
    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", params.id)
      .gte("work_date", salaryLookback),
    supabase
      .from("leave_requests")
      .select("*")
      .eq("user_id", params.id)
      .order("start_date", { ascending: false }),
    // Exact calendar-month slice for the hours chart and the attendance
    // history list below, both scoped to the month selected above.
    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", params.id)
      .gte("work_date", hoursMonthStart)
      .lte("work_date", hoursMonthEnd),
    // Same month window as the hours chart above, for the Productivity section.
    supabase
      .from("productivity_sessions")
      .select("*")
      .eq("user_id", params.id)
      .gte("work_date", hoursMonthStart)
      .lte("work_date", hoursMonthEnd)
      .order("work_date", { ascending: false }),
    supabase
      .from("app_activity")
      .select("*")
      .eq("user_id", params.id)
      .gte("work_date", hoursMonthStart)
      .lte("work_date", hoursMonthEnd),
    // Every ticket row for this employee, so the Tickets section can show the
    // selected month day-by-day AND a running all-time total from one read.
    fetchAll<TicketReport>((from, to) =>
      supabase
        .from("ticket_reports")
        .select("*")
        .eq("user_id", params.id)
        .order("work_date", { ascending: false })
        .order("id")
        .range(from, to)
    ),
  ]);

  if (!profileData) notFound();
  // Defensive default: guards against off_days / disabled_at being undefined
  // right after a deploy but before schema.sql has been re-run to add them.
  const emp = {
    ...profileData,
    off_days: profileData.off_days ?? [0, 6],
    disabled_at: profileData.disabled_at ?? null,
    is_support: profileData.is_support ?? false,
    team_lead_id: profileData.team_lead_id ?? null,
  } as Profile;

  // When this employee is a team lead, load the staff list so the admin can see
  // who's on the team and add/remove members. Members = those pointing at this
  // lead; candidates = everyone else (non-admin) who could be added or moved in.
  const isLead = emp.role === "TEAM_LEAD";
  let teamMembers: TeamPerson[] = [];
  let teamCandidates: TeamPerson[] = [];
  if (isLead) {
    const { data: staff } = await supabase
      .from("profiles")
      .select("id, full_name, position, department, avatar_url, team_lead_id")
      .neq("role", "ADMIN")
      .order("full_name");
    const all = (staff ?? []) as (TeamPerson & { team_lead_id: string | null })[];
    teamMembers = all.filter((p) => p.team_lead_id === emp.id);
    teamCandidates = all.filter((p) => p.id !== emp.id && p.team_lead_id !== emp.id);
  }
  const slips = (slipData ?? []) as SalarySlip[];
  const attendanceForSalary = (salaryAttData ?? []) as Attendance[];
  const leaveRequests = (leaveData ?? []) as LeaveRequest[];
  const hoursAttendance = (hoursAttData ?? []) as Attendance[];
  const productivitySessions = (sessionsData ?? []) as ProductivitySession[];
  const productivityApps = (appsData ?? []) as AppActivity[];

  const approvedLeaveDates = leaveDatesSet(leaveRequests);
  const shiftHours = shiftLengthHours(emp.shift_start, emp.shift_end);
  const hoursDays = buildMonthDayHours(
    hoursAttendance,
    monthKey,
    shiftHours,
    todayKey,
    approvedLeaveDates,
    emp.off_days
  );
  const attendanceHistory = buildAttendanceHistory(
    hoursAttendance,
    approvedLeaveDates,
    emp.off_days,
    hoursMonthStart,
    historyEnd
  );

  // The exact same month-row the Reports tab builds for this employee, so the
  // summary card below matches the Reports table figure-for-figure.
  const reportRow = buildReportRow(emp, monthKey, todayKey, hoursAttendance, approvedLeaveDates, productivitySessions);

  const workingDaysTotal = hoursDays.filter((d) => !d.isRestDay).length;
  const leaveDaysTotal = hoursDays.filter((d) => d.status === "ON_LEAVE").length;

  const productivityTargetHours = requiredProductiveHours(shiftHours);
  const productivityRequiredHours = (workingDaysTotal - leaveDaysTotal) * productivityTargetHours;

  // Tickets this employee logged (only meaningful for support agents — the
  // section below is hidden otherwise). Month slice for the day-by-day view,
  // whole history for the all-time total.
  const monthTicketRows = ticketRows.filter((r) => r.work_date.slice(0, 7) === monthKey);
  const ticketsThisMonth = monthTicketRows.reduce((sum, r) => sum + r.tickets_solved, 0);
  const ticketsAllTime = ticketRows.reduce((sum, r) => sum + r.tickets_solved, 0);

  const monthLabel = formatMonthLabel(monthKey);
  const prevMonthKey = shiftMonthKey(monthKey, -1);
  const nextMonthKey = shiftMonthKey(monthKey, 1);
  const nextDisabled = nextMonthKey > currentMonthKey;
  const isAdmin = emp.role === "ADMIN";

  return (
    <div className="space-y-6">
      <Link
        href="/admin/employees"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Back to employees
      </Link>

      {emp.disabled_at && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-800">
          <CalendarOff className="h-4 w-4 shrink-0" />
          <span>
            This account was <span className="font-semibold">disabled</span> on {formatDate(emp.disabled_at)}. The
            employee can&apos;t sign in, and they&apos;re excluded from attendance and stats from{" "}
            {formatMonthLabel(shiftMonthKey(emp.disabled_at.slice(0, 7), 1))} onward. All of their past records are
            kept. Re-enable from the settings panel at the bottom.
          </span>
        </div>
      )}

      {/* 1 — Who this is */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar name={emp.full_name} src={emp.avatar_url} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-navy">{emp.full_name}</h1>
              {isAdmin && <span className="badge bg-brand-50 text-brand-700">Administrator</span>}
              {isLead && <span className="badge bg-violet-50 text-violet-700">Team lead</span>}
              {emp.is_support && <span className="badge bg-sky-50 text-sky-700">Support agent</span>}
              {emp.disabled_at && <span className="badge bg-amber-50 text-amber-700">Disabled</span>}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {emp.position || "Employee"}
              {emp.department ? ` · ${emp.department}` : ""}
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">Joined {formatDate(emp.created_at)}</div>
        </div>
        <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-slate-50 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Row icon={<Mail className="h-4 w-4" />} label="Email" value={emp.email} />
          <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={emp.phone} />
          <Row icon={<IdCard className="h-4 w-4" />} label="CNIC" value={emp.cnic} />
          <Row icon={<Building2 className="h-4 w-4" />} label="Department" value={emp.department} />
          <Row icon={<Briefcase className="h-4 w-4" />} label="Position" value={emp.position} />
          <Row
            icon={<Clock className="h-4 w-4" />}
            label="Shift"
            value={`${formatTimeOfDay(emp.shift_start)} – ${formatTimeOfDay(emp.shift_end)}`}
          />
          <Row icon={<CalendarOff className="h-4 w-4" />} label="Rest days" value={formatOffDays(emp.off_days)} />
          <Row icon={<MapPin className="h-4 w-4" />} label="Address" value={emp.address} />
        </dl>
      </div>

      {isLead && (
        <TeamMembersManager leadId={emp.id} members={teamMembers} candidates={teamCandidates} />
      )}

      {/* 2 — Month toolbar (one selector drives the whole page) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-navy">Monthly report</h2>
          <p className="mt-1 text-sm text-slate-500">
            {monthLabel} · {formatHours(shiftHours)} shift ({emp.shift_start.slice(0, 5)}–{emp.shift_end.slice(0, 5)}),
            off {formatOffDays(emp.off_days)}.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <Link
            href={`/admin/employees/${emp.id}?month=${prevMonthKey}`}
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
              href={`/admin/employees/${emp.id}?month=${nextMonthKey}`}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-navy"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* 3 — The report, laid out as readable tiles (same figures as the Reports tab) */}
      <MonthlyReportCard row={reportRow} />

      {/* 4 — Daily hours: graph by default, full attendance table one tab away */}
      <HoursSection
        subtitle={`Hours worked each day against the ${formatHours(
          shiftHours
        )} target. Switch to the table for the full day-by-day attendance.`}
        chart={
          <div className="card p-6">
            {hoursDays.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">No working days in this month.</p>
            ) : (
              <MonthlyHoursChart data={hoursDays} targetHours={shiftHours} />
            )}
          </div>
        }
        table={<AttendanceEditor employeeId={emp.id} entries={attendanceHistory} monthLabel={monthLabel} />}
      />

      {/* 5 — Productivity (tracker): its own graph/table tabs live inside */}
      <EmployeeProductivity
        employeeId={emp.id}
        sessions={productivitySessions}
        apps={productivityApps}
        monthStart={hoursMonthStart}
        monthEnd={historyEnd}
        requiredHours={productivityRequiredHours}
      />

      {/* 6 — Support tickets (support agents only) */}
      {emp.is_support && (
        <EmployeeTickets
          monthLabel={monthLabel}
          monthStart={hoursMonthStart}
          monthEnd={historyEnd}
          monthEntries={monthTicketRows}
          ticketsThisMonth={ticketsThisMonth}
          ticketsAllTime={ticketsAllTime}
        />
      )}

      {/* 7 — Records (full width, each its own card) */}
      <SalarySlipEditor
        employeeId={emp.id}
        slips={slips}
        attendance={attendanceForSalary}
        leaveRequests={leaveRequests}
        shiftStart={emp.shift_start}
        shiftEnd={emp.shift_end}
        offDays={emp.off_days}
      />
      <EmployeeLeaveHistory requests={leaveRequests} />

      {/* 8 — Admin settings, kept at the bottom and out of the way */}
      <div className="card p-6">
        <h3 className="font-semibold text-navy">Employee settings</h3>
        <p className="text-xs text-slate-400">Shift, rest days, device mapping and account access.</p>
        {/* Two columns on wider screens so the controls don't make a tall column. */}
        <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
          <ShiftEditForm employeeId={emp.id} initialStart={emp.shift_start} initialEnd={emp.shift_end} />
          <OffDaysEditForm employeeId={emp.id} initialOffDays={emp.off_days} />
          <DeviceMappingForm employeeId={emp.id} initialValue={emp.device_user_id} />
          {!isAdmin && <SupportAgentToggle employeeId={emp.id} initialIsSupport={emp.is_support} />}
          {!isAdmin && <TeamLeadToggle employeeId={emp.id} initialIsLead={isLead} />}
          {!isAdmin && (
            <DisableEmployeeControl employeeId={emp.id} employeeName={emp.full_name} disabledAt={emp.disabled_at} />
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
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
